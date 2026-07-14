export interface GoQRReadSymbol {
  seq: number;
  data: string | null;
  error: string | null;
}

export interface GoQRReadResponse {
  type: string;
  symbol: GoQRReadSymbol[];
}

const GOQR_BASE_URL = 'https://api.qrserver.com/v1/create-qr-code/';

export async function readQRCode(file: File): Promise<GoQRReadResponse> {
  const formData = new FormData();
  formData.append('file', file, file.name || 'scan.png');

  const res = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`goQR read API returned ${res.status}`);
  }

  const data = await res.json();
  return data[0];
}

export function generateQRCodeUrl(sampleUrl: string): string {
  const params = new URLSearchParams({
    data:             sampleUrl,
    size:             '300x300',
    format:           'png',
    ecc:              'M',
    qzone:            '4',
    margin:           '1',
    color:            '0-0-0',
    bgcolor:          '255-255-255',
    'charset-source': 'UTF-8',
    'charset-target': 'UTF-8',
  });

  return `${GOQR_BASE_URL}?${params.toString()}`;
}
