---
trigger: always_on
---

This file defines the code style, naming conventions, and patterns the agent must follow consistently across the entire Labflow codebase. Read this before writing any code.


## 1. Language and Runtime

- Language: TypeScript (strict mode enabled — `"strict": true` in `tsconfig.json`)
- Runtime: Node.js via Next.js
- No JavaScript files — every file must use `.ts` or `.tsx`
- No `any` types — use proper types or `unknown` with a type guard

---

## 2. File and Folder Naming

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase | `SampleForm.tsx`, `QRDisplay.tsx` |
| Pages (App Router) | lowercase `page.tsx` | `app/samples/new/page.tsx` |
| API routes | lowercase `route.ts` | `app/api/samples/route.ts` |
| Utility/lib files | camelCase | `generateId.ts`, `goqr.ts` |
| Hooks | camelCase, prefixed `use` | `useSyncQueue.ts`, `useToast.ts` |
| Types file | `index.ts` in `/types/` | `types/index.ts` |
| Constants | `SCREAMING_SNAKE_CASE` for values, camelCase for the file | `const MAX_IMAGE_SIZE_MB = 10` |

---

## 3. TypeScript Conventions

### 3.1 Define all shared types in `types/index.ts`

```typescript
// types/index.ts

export type Role = 'ADMIN' | 'RESEARCHER' | 'STUDENT' | 'VIEWER';

export type ActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'PHASE_CHANGE'
  | 'IMAGE_ATTACH';

export interface Sample {
  id: string;
  slug: string;
  humanId: string;
  qrCodeUrl: string | null;
  sampleType: string;
  source: string;
  collectionDate: string;        // ISO date string
  description: string | null;
  experimentType: string | null;
  currentPhase: string | null;
  phaseHistory: PhaseEntry[];
  images: ImageEntry[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedById: string | null;
  labId: string;
}

export interface PhaseEntry {
  phase: string;
  updatedBy: string;
  timestamp: string;
}

export interface ImageEntry {
  filename: string;
  uploaderId: string;
  uploadTimestamp: string;
  url: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  actionType: ActionType;
  sampleId: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  ipAddress: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  labId: string;
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
}

export interface Lab {
  id: string;
  name: string;
  institution: string | null;
  createdAt: string;
}

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

### 3.2 Use interfaces for objects, types for unions

```typescript
// ✅ Correct
interface SampleFormData {
  sampleType: string;
  source: string;
  collectionDate: string;
}

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'failed';

// ❌ Avoid
type SampleFormData = { sample_type: string; source: string };
```

### 3.3 Type all function parameters and return values

```typescript
// ✅ Correct
async function createSample(data: SampleFormData, userId: string): Promise<Sample> { ... }

// ❌ Avoid
async function createSample(data, userId) { ... }
```

---

## 4. React Component Conventions

### 4.1 Functional components only — no class components

```typescript
// ✅ Correct — named export for feature components, default export only for pages
export function SampleForm({ onSave }: SampleFormProps) {
  return ( ... );
}

// ❌ Avoid — class components are deprecated in React 18+
export default class SampleForm extends React.Component { ... }
```

### 4.2 Props interface defined above the component

```typescript
interface SampleFormProps {
  onSave: (sample: Sample) => void;
  initialData?: Partial<SampleFormData>;
}

export function SampleForm({ onSave, initialData }: SampleFormProps) { ... }
```

### 4.3 Keep components focused — one responsibility per component

- `SampleForm` handles input collection only — not submission logic
- `SampleDetail` renders a sample record — not editing
- `PhaseTracker` handles phase display and update — not image attachment

### 4.4 Use named exports for utility components, default exports for pages

```typescript
// components/ui/Button.tsx — named export
export function Button({ ... }) { ... }

// app/samples/new/page.tsx — default export
export default function NewSamplePage() { ... }
```

---

## 5. API Route Conventions

### 5.1 Standard structure for every API route

```typescript
// app/api/samples/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { canPerformAction } from '@/lib/auth/permissions';
import { createSample } from '@/lib/db/samples';
import { writeAuditLog } from '@/lib/db/audit';
import { createSampleSchema } from '@/lib/validators/sample';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate — every route must call auth() independently
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorise — check role before any DB operation
    if (!canPerformAction(session.user.role, 'create_sample')) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    // 3. Parse and validate input with Zod
    const body = await req.json();
    const parsed = createSampleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // 4. Execute business logic — always scope to session.user.labId
    const sample = await createSample(data, session.user.id, session.user.labId);

    // 5. Write audit log with ipAddress
    await writeAuditLog({
      userId:    session.user.id,
      actionType: 'CREATE',
      sampleId:  sample.id,
      ipAddress: getIpAddress(req),
    });

    // 6. Return response
    return NextResponse.json(sample, { status: 201 });

  } catch (error) {
    console.error('[POST /api/samples]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

// ─── Helper: extract IP address from request headers ────────────────────
function getIpAddress(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
```

See the `api-route-scaffolder` skill for the complete 6-step route template with all Zod schemas.

### 5.2 Never expose raw errors to the client

```typescript
// ✅ Correct
return NextResponse.json(
  { error: 'Something went wrong. Please try again later.' },
  { status: 500 }
);

// ❌ Never do this
return NextResponse.json({ error: error.message }, { status: 500 });
```

---

## 6. Database Query Conventions (`lib/db/`)

- All database logic lives in `lib/db/` — never write raw SQL in API routes or components
- Each entity has its own file: `samples.ts`, `users.ts`, `audit.ts`, `labs.ts`
- Functions are async and return typed results
- All queries use **Prisma** — raw SQL is only used as a last resort and must use `prisma.$queryRaw` with tagged templates (never string interpolation)

```typescript
// ✅ Correct — lib/db/samples.ts
// Use Prisma for all database access. Prisma automatically maps snake_case
// columns to camelCase fields and protects against SQL injection.
import { prisma } from '@/lib/db/client';
import type { Sample } from '@/types';

export async function getSampleById(sampleId: string, labId: string): Promise<Sample | null> {
  return prisma.sample.findUnique({
    where: { id: sampleId, labId, isDeleted: false },
  });
}

// ❌ Never do this — Prisma handles this safely and correctly
const result = await db.query(`SELECT * FROM samples WHERE sample_id = '${sampleId}'`);
```

### 6.1 Lab Scoping — Required on Every Query

Every database query on user data must be scoped to the authenticated user's `labId`. This is the primary data isolation boundary between labs:

```typescript
// ✅ Correct — always scope to labId
const samples = await prisma.sample.findMany({
  where: {
    labId: session.user.labId,   // REQUIRED on every query
    isDeleted: false,
  }
});

// ❌ Never — fetches data across all labs
const samples = await prisma.sample.findMany();
```

**Rules:**
- Every query on `Sample`, `User`, and `AuditLog` must include `labId: session.user.labId`
- A user from Lab A must never be able to read, write, or delete data from Lab B
- Lab scoping is enforced at the query level — not just in the API route handler

> See `security.md` §3.2 for the full lab scoping policy.

---

## 7. Human-Readable ID Generation (`lib/id/generateId.ts`)

```typescript
// Format: [TYPE_PREFIX][SEQUENCE]
// Example: MTU001, BLD042, TIS007

export function generateHumanId(
  sampleType: string,
  sequence: number
): string {
  const prefix = sampleType.slice(0, 3).toUpperCase();
  const paddedSequence = String(sequence).padStart(3, '0');
  return `${prefix}${paddedSequence}`;
}
```

- Sequence is scoped per lab — not global
- Duplicate detection is enforced at the database level with a unique constraint on `(human_id, lab_id)`

---

## 8. goQR Wrapper (`lib/qr/goqr.ts`)

```typescript
const GOQR_BASE_URL = 'https://api.qrserver.com/v1/create-qr-code/';

export async function generateQRCodeUrl(sampleUrl: string): Promise<string> {
  const params = new URLSearchParams({
    data:             sampleUrl,   // URLSearchParams handles encoding
    size:             '300x300',
    format:           'png',
    ecc:              'M',
    qzone:            '4',         // QR standard requires 4-module quiet zone
    margin:           '1',
    color:            '0-0-0',     // black modules for max contrast
    bgcolor:          '255-255-255', // white background for max contrast
    'charset-source': 'UTF-8',
    'charset-target': 'UTF-8',
  });

  const qrUrl = `${GOQR_BASE_URL}?${params.toString()}`;

  // Verify goQR is reachable before storing the URL
  const response = await fetch(qrUrl, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(`goQR API returned ${response.status}`);
  }

  return qrUrl;
}

// See the goqr-integration skill for the complete reference, including
// read-qr-code decode endpoint, camera scanning, and error handling.

---

## 9. Error Handling Pattern

- All async functions must be wrapped in `try/catch`
- API routes always return a safe fallback message on unhandled errors
- Client-side errors are shown via the `useToast` hook — never via `alert()`
- Console errors in API routes must include the route path for traceability: `console.error('[POST /api/samples]', error)`

---

## 10. Styling Conventions

- Use **CSS Modules** (`.module.css` files) for all component styling, importing global design tokens.
- No Tailwind CSS, Tailwind utility classes, or other CSS frameworks.
- No inline `style` props unless absolutely necessary (e.g. dynamic values).
- Mobile-first: start with base styles for mobile viewports. Use `@media (min-width: 768px)` to override styles for larger viewports.
- Minimum tap target size: `min-height: 44px` and `min-width: 44px` for all interactive elements (buttons, links, inputs).
- Use semantic HTML elements: `<button>` for actions, `<a>` for navigation, `<input>` for form fields.

```css
/* ✅ Correct — Button.module.css */
/* All values use tokens from tokens/design-tokens.css — never hardcode */
.button {
  width: 100%;
  min-height: 44px;
  min-width: 44px;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: 8px; /* design-system.md: 8px for buttons/inputs */
  font-weight: var(--typography-label-large-font-weight);
  font-size: var(--typography-body-large-font-size);
}

.button:active {
  opacity: 0.8;
}
```

---

## 11. Toast Notification Pattern

All user feedback must go through the `useToast` hook — never use `alert()` or `window.confirm()` for notifications:

```typescript
// hooks/useToast.ts usage
const { showToast } = useToast();

// Success
showToast({ message: `Sample ${id} saved.`, type: 'success' });

// Offline
showToast({ message: 'Saved offline. Will sync when connected.', type: 'warning' });

// Error
showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
```

> Confirmation modals (for destructive or irreversible actions) must use the `Modal` component from `components/ui/Modal.tsx` — not `window.confirm()`.

---

## 12. Audit Log Write Pattern

Every action that modifies data must call `writeAuditLog` immediately after the database operation succeeds:

```typescript
import { writeAuditLog } from '@/lib/db/audit';

await writeAuditLog({
  userId: session.user.id,
  actionType: 'PHASE_CHANGE',
  sampleId: sample.id,
  fieldChanged: 'currentPhase',
  oldValue: previousPhase,
  newValue: newPhase,
});
```

- Audit log writes are fire-and-resolve — they must not block the response to the user
- If an audit log write fails, log the error server-side but do not surface it to the user
- Never skip an audit log write — if in doubt, write it

---

## 13. Import Aliases

Use `@/` as the root alias for all internal imports:

```typescript
// ✅ Correct
import { Sample } from '@/types';
import { createSample } from '@/lib/db/samples';
import { Button } from '@/components/ui/Button';

// ❌ Avoid
import { Sample } from '../../../types';
```

Configure in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```
