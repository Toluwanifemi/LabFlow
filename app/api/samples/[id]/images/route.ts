import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { writeAuditLog } from '@/lib/db/audit';
import { prisma } from '@/lib/db/client';
import { put } from '@vercel/blob';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/tiff'];
const MAX_SIZE = 10 * 1024 * 1024;

function getIpAddress(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user) {
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

    const sample = await prisma.sample.findUnique({
      where: { id: params.id, labId: session.user.labId, isDeleted: false },
    });

    if (!sample) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    let url: string;

    if (blobToken) {
      const blob = await put(file.name, file, {
        access: 'public',
        token: blobToken,
      });
      url = blob.url;
    } else {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      url = `data:${file.type};base64,${base64}`;
    }

    const images = (sample.images as any[]) || [];
    images.push({
      filename: file.name,
      uploaderId: session.user.id,
      uploadTimestamp: new Date().toISOString(),
      url,
    });

    await prisma.sample.update({
      where: { id: params.id, labId: session.user.labId },
      data: { images },
    });

    try {
      await prisma.sampleImage.create({
        data: {
          sampleId: params.id,
          imageUrl: url,
          imageType: 'OTHER',
          uploadedById: session.user.id,
        }
      });
    } catch (err) {
      console.error('Failed to create relational SampleImage:', err);
    }

    await writeAuditLog({
      userId: session.user.id,
      actionType: 'IMAGE_ATTACH',
      sampleId: params.id,
      fieldChanged: 'images',
      ipAddress: getIpAddress(req),
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
