# SKILL.md — goQR Integration

Read this skill before touching anything related to QR codes — the wrapper, the API routes, the scanner component, or the sample creation flow. Every rule here is derived from the actual API behaviour documented at goqr.me.

---

## 1. What goQR Does for Labflow

goQR handles two separate jobs in Labflow:

| Job | API Command | When it runs |
|---|---|---|
| Generate a QR code image for a sample | `create-qr-code` | Once, immediately after a sample is saved |
| Read/decode a QR code image uploaded by the server | `read-qr-code` | Server-side fallback only — primary scanning is camera-based |

These are two completely separate API endpoints with different parameters, different request methods, and different response shapes. The agent must never mix them up.

---

## 2. API Base Details

```
Base URL:   https://api.qrserver.com/v1/
No API key required.
No authentication headers required.
No request limit — but >10,000 requests/day should be reported to goQR.
goQR does NOT log the contents of QR codes — only IP and referrer.
```

**Both commands live under the same base URL:**
- Generate: `https://api.qrserver.com/v1/create-qr-code/`
- Read:     `https://api.qrserver.com/v1/read-qr-code/`

---

## 3. Command 1 — create-qr-code (QR Generation)

### 3.1 How it works

Send a GET request with the sample URL as the `data` parameter. goQR returns the QR code image directly — the response body IS the image file. There is no JSON wrapper.

```
GET https://api.qrserver.com/v1/create-qr-code/?data=[URL-encoded-sample-url]&size=300x300&...
```

The URL you get back from constructing this request IS the `qrCodeUrl` you store on the sample record. You do not need to download and re-host the image — just store the goQR URL itself.

### 3.2 Required Parameter

| Parameter | Type | Rules |
|---|---|---|
| `data` | string | **Mandatory.** The text to encode — for Labflow this is always the full sample URL. Must be URL-encoded. Max ~900 characters. Shorter is better. |

### 3.3 Labflow-Specific Parameters

Use these exact values for every QR code generated in Labflow. Do not allow these to be configured by users.

| Parameter | Value | Reason |
|---|---|---|
| `size` | `300x300` | Large enough to scan reliably on printed labels. Must be equal dimensions (e.g. 300x300, not 300x200). |
| `format` | `png` | Best for web display. Never use `jpeg` for QR codes — lossy compression degrades scannability. |
| `ecc` | `M` | Medium error correction — recovers ~15% damaged data. Better than default `L` for lab label durability (scratches, moisture). Not `H` — higher ECC = more complex QR = harder to scan on older phones. |
| `qzone` | `4` | 4-module quiet zone around the code. The QR standard recommends 4. Required for reliable scanning. |
| `margin` | `1` | 1px pixel margin. Keeps the image clean. |
| `color` | `0-0-0` | Black modules — maximum contrast. Never change this. |
| `bgcolor` | `255-255-255` | White background — maximum contrast. Never change this. |
| `charset-source` | `UTF-8` | Labflow URLs are UTF-8. |
| `charset-target` | `UTF-8` | Store as UTF-8 inside the QR code. |

### 3.4 The Wrapper: `lib/qr/goqr.ts`

All goQR `create-qr-code` calls are centralised in this one file. The agent must never call the goQR API directly from a component, a page, or any file other than this wrapper.

```typescript
// lib/qr/goqr.ts

const GOQR_CREATE_URL = 'https://api.qrserver.com/v1/create-qr-code/';

/**
 * Generates a goQR URL for the given sample URL.
 * Does NOT download the image — returns the URL itself as the qrCodeUrl.
 * Throws if the goQR service is unreachable.
 */
export async function generateQRCodeUrl(sampleUrl: string): Promise<string> {
  if (!sampleUrl || sampleUrl.trim().length === 0) {
    throw new Error('generateQRCodeUrl: sampleUrl cannot be empty');
  }

  const params = new URLSearchParams({
    data:             sampleUrl,   // URLSearchParams handles URL encoding automatically
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

  const qrUrl = `${GOQR_CREATE_URL}?${params.toString()}`;

  // Verify goQR is reachable before storing the URL
  // Use HEAD to avoid downloading the full image during verification
  const response = await fetch(qrUrl, { method: 'HEAD' });

  if (!response.ok) {
    throw new Error(`goQR create-qr-code failed: HTTP ${response.status}`);
  }

  // The URL itself is the image source — store it as qrCodeUrl on the sample
  return qrUrl;
}
```

### 3.5 How to Call It in the Sample Creation Flow

The goQR call happens **after** the sample is saved to the database. Never before. If goQR fails, the sample save must still succeed.

```typescript
// app/api/samples/route.ts — POST handler (simplified)

// Step 1: Save sample to DB first
const sample = await prisma.sample.create({ data: sampleData });

// Step 2: Construct the sample URL
const sampleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/samples/${sample.id}`;

// Step 3: Attempt QR generation — NEVER block the save if this fails
try {
  const qrCodeUrl = await generateQRCodeUrl(sampleUrl);
  await prisma.sample.update({
    where: { id: sample.id },
    data: { qrCodeUrl },
  });
} catch (error) {
  // goQR failed — log server-side, queue retry, do NOT fail the request
  console.error(`[QR Generation Failed] Sample ${sample.id}:`, error);
  // TODO: add to retry queue (e.g. a background job or a retryAt field on Sample)
}

// Step 4: Return the sample regardless of QR outcome
return NextResponse.json(sample, { status: 201 });
```

### 3.6 Displaying the QR Code in the UI

The `qrCodeUrl` stored on the sample IS a valid `<img src>` — render it directly using CSS Modules (see `code-style.md §10` for CSS Module conventions):

```css
/* components/qr/QRDisplay.module.css */

.placeholder {
  width: 192px;
  height: 192px;
  background: var(--color-surface-variant);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholderText {
  font-size: var(--typography-body-small-font-size);
  line-height: var(--typography-body-small-line-height);
  color: var(--color-on-surface-variant);
  text-align: center;
  padding: 0 16px;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.image {
  border-radius: 8px;
  border: 1px solid var(--color-outline-variant);
}

.humanId {
  font-size: var(--typography-body-medium-font-size);
  line-height: var(--typography-body-medium-line-height);
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  color: var(--color-on-surface);
}

.downloadButton {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-outline-variant);
  color: var(--color-on-surface-variant);
  border-radius: 8px;
  padding: 0 16px;
  font-size: var(--typography-label-large-font-size);
  line-height: var(--typography-label-large-line-height);
  font-weight: 500;
  text-decoration: none;
}

.downloadButton:hover {
  background: var(--color-surface-variant);
}
```

```tsx
// components/qr/QRDisplay.tsx
import styles from './QRDisplay.module.css';

interface QRDisplayProps {
  qrCodeUrl: string | null;
  humanId: string;
}

export function QRDisplay({ qrCodeUrl, humanId }: QRDisplayProps) {
  if (!qrCodeUrl) {
    return (
      <div className={styles.placeholder}>
        <p className={styles.placeholderText}>
          QR code is being generated. Refresh to check.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <img
        src={qrCodeUrl}
        alt={`QR code for sample ${humanId}`}
        width={192}
        height={192}
        className={styles.image}
      />
      <p className={styles.humanId}>{humanId}</p>
      <a
        href={qrCodeUrl}
        download={`${humanId}-qr.png`}
        className={styles.downloadButton}
      >
        Download QR Code
      </a>
    </div>
  );
}
```

### 3.7 create-qr-code Rules — Never Violate These

- **NEVER** call `create-qr-code` before the sample is saved to the database
- **NEVER** block the sample save if `create-qr-code` fails — always decouple
- **NEVER** regenerate a QR code for an existing sample — generate once on creation only
- **NEVER** allow user input to change `size`, `ecc`, `color`, `bgcolor`, or `format` — these are fixed
- **NEVER** use `format=jpeg` for QR codes — lossy compression breaks scannability
- **NEVER** use `ecc=H` — it produces a denser QR matrix that older phones struggle to scan
- **NEVER** use `size` with unequal dimensions (e.g. `300x200`) — goQR requires square dimensions
- **NEVER** call this endpoint from a React component — only from `lib/qr/goqr.ts` via an API route
- **ALWAYS** URL-encode the `data` parameter — use `URLSearchParams` which handles this automatically
- **ALWAYS** store the constructed goQR URL as `qrCodeUrl` — do not download and re-host the image

---

## 4. Command 2 — read-qr-code (QR Decoding)

### 4.1 How it works

The goQR `read-qr-code` command decodes a QR code image and returns the text content stored inside it. It accepts either a publicly accessible image URL (`fileurl`) or a direct file upload (`file` via POST).

**Important for Labflow:** The primary QR scanning experience uses the device camera directly in the browser — no goQR API call is made during a live camera scan. goQR's `read-qr-code` is used as a **server-side fallback** only — for example, when a user uploads a photo of a QR code from their gallery instead of scanning live.

### 4.2 Method A — Decode by URL (GET)

Use when the QR code image is publicly accessible on the internet (e.g. a stored goQR URL).

```
GET https://api.qrserver.com/v1/read-qr-code/?fileurl=[URL-encoded-image-url]&outputformat=json
```

```typescript
// lib/qr/goqr.ts — add this function

/**
 * Decodes a QR code from a publicly accessible image URL.
 * Returns the decoded text content, or null if decoding fails.
 */
export async function decodeQRCodeFromUrl(imageUrl: string): Promise<string | null> {
  const params = new URLSearchParams({
    fileurl:      imageUrl,   // URLSearchParams handles encoding
    outputformat: 'json',
  });

  const response = await fetch(
    `https://api.qrserver.com/v1/read-qr-code/?${params.toString()}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error(`goQR read-qr-code failed: HTTP ${response.status}`);
  }

  const data = await response.json() as GoQRReadResponse[];

  // goQR returns an array — always take the first result
  const result = data?.[0]?.symbol?.[0];

  if (!result || result.error || !result.data) {
    return null; // QR code could not be decoded
  }

  return result.data; // the decoded URL string, e.g. "https://app.labflow.com/samples/cld1234567890"
}
```

### 4.3 Method B — Decode by File Upload (POST)

Use when a user uploads an image file directly from their device (gallery photo of a QR label).

```typescript
// app/api/qr/read/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Validate: goQR accepts PNG, GIF, JPEG only — max 1MiB
    const ALLOWED_TYPES = ['image/png', 'image/gif', 'image/jpeg'];
    const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MiB

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PNG, GIF, or JPEG image.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Image too large. Maximum file size for QR scanning is 1MB.' },
        { status: 400 }
      );
    }

    // Forward the file to goQR as multipart/form-data
    const goQRForm = new FormData();
    goQRForm.append('file', file);
    goQRForm.append('outputformat', 'json');

    const goQRResponse = await fetch(
      'https://api.qrserver.com/v1/read-qr-code/',
      { method: 'POST', body: goQRForm }
    );

    if (!goQRResponse.ok) {
      throw new Error(`goQR returned HTTP ${goQRResponse.status}`);
    }

    const result = await goQRResponse.json() as GoQRReadResponse[];
    const symbol = result?.[0]?.symbol?.[0];

    if (!symbol || symbol.error || !symbol.data) {
      return NextResponse.json(
        { error: 'Could not read QR code from the provided image.' },
        { status: 422 }
      );
    }

    // Return the decoded content — the caller resolves it to a sample ID
    return NextResponse.json({ data: symbol.data }, { status: 200 });

  } catch (error) {
    console.error('[POST /api/qr/read]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
```

### 4.4 goQR Response Type Definitions

Add these to `types/index.ts`:

```typescript
// types/index.ts

export interface GoQRReadSymbol {
  seq: number;
  data: string | null;
  error: string | null;
}

export interface GoQRReadResponse {
  type: string;
  symbol: GoQRReadSymbol[];
}
```

### 4.5 Parsing the Response Correctly

goQR always returns an **array**, even for a single QR code. Always access `[0].symbol[0]`:

```typescript
// ✅ Correct
const symbol = result?.[0]?.symbol?.[0];
const decodedText = symbol?.data;         // null if failed
const errorMessage = symbol?.error;       // null if successful

// ❌ Wrong — goQR returns an array, not a plain object
const decodedText = result.data;
```

**Successful decode response (JSON):**
```json
[
  {
    "type": "qrcode",
    "symbol": [
      {
        "seq": 0,
        "data": "https://app.labflow.com/samples/tumour-mtu001",
        "error": null
      }
    ]
  }
]
```

**Failed decode response (JSON):**
```json
[
  {
    "type": "qrcode",
    "symbol": [
      {
        "seq": 0,
        "data": null,
        "error": "Could not read barcode"
      }
    ]
  }
]
```

**Rule:** A response is only successful when `symbol[0].data` is a non-null string AND `symbol[0].error` is null. Check both.

### 4.6 read-qr-code Rules — Never Violate These

- **NEVER** use `read-qr-code` for live camera scanning — use the browser's camera API directly
- **NEVER** send files larger than 1MiB to `read-qr-code` — goQR rejects them
- **NEVER** send file formats other than PNG, GIF, or JPEG — validate before forwarding
- **NEVER** forward the raw goQR error string to the user — return the Labflow safe error message
- **NEVER** assume the response is successful — always check both `data` and `error` fields
- **ALWAYS** use `outputformat=json` — never XML
- **ALWAYS** proxy file uploads through your own API route — never call goQR directly from the browser

---

## 5. Primary Scanning — Camera (No goQR Involved)

The primary QR scanning flow uses the browser's camera API directly — no goQR API call is made. The goQR `read-qr-code` API is a fallback only.

```
Primary scan (live camera)  →  browser camera API  →  decode in browser  →  navigate to sample URL
Fallback scan (image upload) →  POST /api/qr/read   →  goQR read-qr-code  →  navigate to sample URL
```

### 5.1 Camera Scanner Component

Use the `html5-qrcode` npm package for in-browser QR scanning. It handles camera access, frame decoding, and error handling natively.

```bash
npm install html5-qrcode
```

Add the CSS Module alongside the component (see `code-style.md §10` and `design-system.md` for conventions):

```css
/* components/qr/QRScanner.module.css */

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.errorContainer {
  background: var(--color-error-container);
  border: 1px solid var(--color-error);
  border-radius: 12px;
  padding: 16px;
  font-size: var(--typography-body-medium-font-size);
  line-height: var(--typography-body-medium-line-height);
  color: var(--color-on-error-container);
}

.scannerViewport {
  width: 100%;
  max-width: 384px;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-outline-variant);
}

.prompt {
  font-size: var(--typography-body-medium-font-size);
  line-height: var(--typography-body-medium-line-height);
  color: var(--color-on-surface-variant);
}
```

```tsx
// components/qr/QRScanner.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import styles from './QRScanner.module.css';

interface QRScannerProps {
  onScanSuccess?: (decodedText: string) => void;
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const scannerId = 'qr-scanner-container';
    scannerRef.current = new Html5Qrcode(scannerId);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    scannerRef.current
      .start(
        { facingMode: 'environment' }, // rear camera on mobile
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Scan attempt failed — fires repeatedly while scanning, ignore it
        }
      )
      .then(() => setIsScanning(true))
      .catch((err) => {
        setError('Camera access denied. Please allow camera permissions and try again.');
        console.error('[QRScanner]', err);
      });

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  function handleScanSuccess(decodedText: string) {
    scannerRef.current?.stop().catch(() => {});

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    if (!decodedText.startsWith(`${appUrl}/samples/`)) {
      showToast({ message: 'This sample does not exist.', type: 'error' });
      return;
    }

    const id = decodedText.replace(`${appUrl}/samples/`, '');
    if (!id) {
      showToast({ message: 'This sample does not exist.', type: 'error' });
      return;
    }

    onScanSuccess?.(decodedText);
    router.push(`/samples/${id}`);
  }

  return (
    <div className={styles.container}>
      {error ? (
        <div className={styles.errorContainer}>{error}</div>
      ) : (
        <div id="qr-scanner-container" className={styles.scannerViewport} />
      )}
      {isScanning && (
        <p className={styles.prompt}>Point your camera at a Labflow QR code</p>
      )}
    </div>
  );
}
```

---

## 6. Full Scan Flow — Decision Tree

```
User taps "Scan" in bottom nav
        |
        ▼
QRScanner component mounts
        |
        ▼
Does the browser support camera access?
   YES → Start live camera scan (html5-qrcode)
   NO  → Show "Upload QR image" fallback button
        |
        ▼ (camera path)
QR code detected in camera frame
        |
        ▼
Is the decoded URL a valid Labflow sample URL?
   YES → router.push(`/samples/${id}`)
   NO  → Toast: "This sample does not exist."
        |
        ▼ (upload path)
User uploads image file
        |
        ▼
POST /api/qr/read → goQR read-qr-code
        |
        ▼
Did goQR return a valid decoded URL?
   YES → router.push(`/samples/${id}`)
   NO  → Toast: "Could not read QR code from the provided image."
        |
        ▼ (final fallback — always available)
User taps "Search by ID"
        |
        ▼
User types humanId (e.g. MTU001)
        |
        ▼
GET /api/samples?humanId=MTU001
        |
        ▼
Sample found? YES → router.push(`/samples/${id}`)
             NO  → "This sample does not exist."
```

---

## 7. API Route Structure for QR

```
app/api/
└── qr/
    └── read/
        └── route.ts    ← POST: accepts image file, forwards to goQR read-qr-code, returns decoded text
```

QR generation has no dedicated API route — it is called inside `app/api/samples/route.ts` (POST) after the sample is saved, via `lib/qr/goqr.ts`.

---

## 8. Environment Variables Used

```bash
# Required for constructing the sample URL encoded in the QR code
NEXT_PUBLIC_APP_URL="https://your-labflow-domain.vercel.app"
# In development: NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

No goQR API key is required. No additional environment variables are needed for goQR.

---

## 9. Error Handling Reference

| Scenario | Cause | What the Agent Must Do |
|---|---|---|
| `create-qr-code` returns non-200 | goQR is down or rate-limiting | Log server-side. Do NOT fail the sample save. Queue retry. |
| `create-qr-code` times out | Network issue on Vercel | Same as above — decouple from sample save. |
| `qrCodeUrl` is null on sample detail | QR not yet generated | Show placeholder UI (see QRDisplay component). |
| `read-qr-code` returns `error` in symbol | Image unreadable | Return: `"Could not read QR code from the provided image."` |
| `read-qr-code` file >1MiB | Oversized upload | Validate before forwarding. Return: `"Image too large. Maximum file size for QR scanning is 1MB."` |
| Decoded URL is not a Labflow URL | Wrong QR code scanned | Return: `"This sample does not exist."` |
| Camera permission denied | User blocked camera | Show: `"Camera access denied. Please allow camera permissions and try again."` — offer upload fallback. |
| `data` is null in read response | goQR could not decode | Return: `"Could not read QR code from the provided image."` |

---

## 10. Cross-References

| Topic | File |
|---|---|
| CSS Module conventions and Type Scale mapping | `code-style.md §10` |
| Design token pipeline (colors, typography, spacing, radius) | `design-system.md` |
| Auth helpers (`auth()` import, session check pattern) | `security.md §3` |
| API route structure (rate limiting, audit log pattern) | `skills/api-route-scaffolder/SKILL.md` |
| Component rules (primitives, interactivity, confirmation modals) | `skills/component-builder/SKILL.md` |
| Full token reference | `tokens/design-tokens.css` |

---

## 11. Skill Checklist

Before marking any QR-related feature complete, verify:

- [ ] `generateQRCodeUrl()` is the only place `create-qr-code` is called — never inline in routes or components
- [ ] QR generation is called **after** sample save — never before
- [ ] A goQR failure does NOT block or fail the sample save response
- [ ] `qrCodeUrl` is stored as the goQR URL string — not a downloaded file path
- [ ] `ecc=M` and `qzone=4` are used on every generated QR code
- [ ] `format=png` is used — never `jpeg`
- [ ] `size=300x300` — equal square dimensions
- [ ] The QR code is never regenerated for an existing sample
- [ ] `read-qr-code` is only called server-side via `/api/qr/read` — never from the browser
- [ ] File uploads to `read-qr-code` are validated for type (PNG/GIF/JPEG) and size (<1MiB) before forwarding
- [ ] goQR response is parsed by checking `[0].symbol[0].data` AND `[0].symbol[0].error`
- [ ] `outputformat=json` is always used for `read-qr-code`
- [ ] Decoded URLs are validated as Labflow sample URLs before navigating
- [ ] The manual ID search fallback exists on the scan page and works independently of goQR
- [ ] Camera scanner uses `facingMode: 'environment'` (rear camera) on mobile
- [ ] All goQR errors are logged server-side and never exposed raw to the user