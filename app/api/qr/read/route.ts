import { NextRequest, NextResponse } from 'next/server';
import { readQRCode } from '@/lib/qr/goqr';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const result = await readQRCode(file);
    
    const symbol = result.symbol?.[0];
    if (symbol?.data) {
      return NextResponse.json({ url: symbol.data });
    } else {
      return NextResponse.json({ error: 'No QR code detected' }, { status: 400 });
    }
  } catch (error) {
    console.error('[POST /api/qr/read]', error);
    return NextResponse.json({ error: 'Failed to read QR code' }, { status: 500 });
  }
}
