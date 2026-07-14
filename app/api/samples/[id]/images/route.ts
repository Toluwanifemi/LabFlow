import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { getSampleById } from '@/lib/db/samples';
import { attachImage } from '@/lib/db/sampleImages';
import { writeAuditLog } from '@/lib/db/audit';
import { put } from '@vercel/blob';
import { getIpAddress } from '@/lib/api/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/tiff'];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(session.user.role, 'attach_image')) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPEG, PNG, or TIFF image.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Image too large. Maximum file size is 10MB.' },
        { status: 400 }
      );
    }

    const sample = await getSampleById(params.id, session.user.labId);

    if (!sample) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: 'Image storage is not configured. Please contact your administrator.' },
        { status: 500 }
      );
    }

    const blob = await put(file.name, file, {
      access: 'public',
      token: blobToken,
    });
    const url = blob.url;

    const attached = await attachImage(params.id, session.user.labId, {
      filename: file.name,
      uploaderId: session.user.id,
      uploadTimestamp: new Date().toISOString(),
      url,
    });

    if (!attached) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
    }

    await writeAuditLog({
      userId: session.user.id,
      actionType: 'IMAGE_ATTACH',
      sampleId: params.id,
      fieldChanged: 'images',
      ipAddress: getIpAddress(req),
      labId: session.user.labId,
    });

    return NextResponse.json({ url, filename: file.name }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/samples/[id]/images]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
