# SKILL.md — API Route Scaffolder

> Read this skill before creating any file inside `app/api/`. Every API route in Labflow must follow this pattern without exception.

## The 6-Step Route Pattern

Every single API route in Labflow must follow these six steps in this exact order. No step may be skipped. No step may be reordered.

For rate-limited endpoints (login, signup, password reset), also check rate limits before Step 1 — see `security.md §5` for implementation.

```
Step 0 (rate-limited endpoints only) — Rate Limit   Check with checkRateLimit()
Step 1 — Authenticate                                Verify a valid session exists
Step 2 — Authorise                                   Check the user's role can perform this action
Step 3 — Parse & Validate                            Parse the request body and validate with Zod
Step 4 — Execute                                     Run the database operation
Step 5 — Audit                                       Write the audit log entry
Step 6 — Respond                                     Return the JSON response
```

---

## The Master Route Template

Copy this template for every new route. Fill in the specifics. Never skip a step.

```typescript
// app/api/[resource]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canPerformAction } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { writeAuditLog } from '@/lib/db/audit';
import { z } from 'zod';

// ─── Zod schema for this route ────────────────────────────────────────────
const requestSchema = z.object({
  // define fields here
});

export async function POST(req: NextRequest) {
  try {
    // ── Step 1: Authenticate ──────────────────────────────────────────────
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Step 2: Authorise ─────────────────────────────────────────────────
    if (!canPerformAction(session.user.role, 'action_name')) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    // ── Step 3: Parse & Validate ──────────────────────────────────────────
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // ── Step 4: Execute ───────────────────────────────────────────────────
    const result = await prisma.modelName.create({
      data: {
        ...data,
        labId: session.user.labId,       // always scope to the user's lab
        createdById: session.user.id,
      },
    });

    // ── Step 5: Audit ─────────────────────────────────────────────────────
    await writeAuditLog({
      userId:    session.user.id,
      actionType: 'CREATE',
      sampleId:  result.id,
      ipAddress: getIpAddress(req),
    });

    // ── Step 6: Respond ───────────────────────────────────────────────────
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('[POST /api/resource]', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

// ─── Helper: extract IP address ──────────────────────────────────────────
function getIpAddress(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
```

---

## Audit Log Writer

Every route that writes, updates, or deletes data must call `writeAuditLog` in Step 5. This function lives in `lib/db/audit.ts`.

```typescript
// lib/db/audit.ts

import { prisma } from '@/lib/db/client';
import { ActionType } from '@prisma/client';

interface AuditLogInput {
  userId:       string;
  actionType:   ActionType;
  sampleId:     string;    // required — references a valid Sample
  fieldChanged?: string;
  oldValue?:    string;
  newValue?:    string;
  ipAddress?:   string;
}

// Post-MVP: make sampleId optional to support non-sample audit events
// (team role changes, lab settings edits). Requires Prisma schema change
// and a new ActionType e.g. ROLE_CHANGE.

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:       input.userId,
        actionType:   input.actionType,
        sampleId:     input.sampleId,
        fieldChanged: input.fieldChanged ?? null,
        oldValue:     input.oldValue    ?? null,
        newValue:     input.newValue    ?? null,
        ipAddress:    input.ipAddress   ?? null,
      },
    });
  } catch (auditError) {
    // Audit log failure must never crash the parent request
    // Log server-side only — never surface to the user
    console.error('[writeAuditLog failed]', auditError);
  }
}
```

**Rules for audit log writes:**
- Call `writeAuditLog` after every successful DB write — never before
- Wrap in its own try/catch inside the function — a failed audit write must never crash the parent route
- Include `fieldChanged`, `oldValue`, and `newValue` for UPDATE and PHASE_CHANGE actions
- Always pass `ipAddress` — extract from request headers using `getIpAddress(req)`
- Never write to `AuditLog` directly with `prisma.auditLog.update()` or `prisma.auditLog.delete()`

---

## Zod Validation Schemas

All Zod schemas live in `lib/validators/`. Import them into routes — never define inline schemas except for route-specific validation.

```typescript
// lib/validators/sample.ts
import { z } from 'zod';

export const createSampleSchema = z.object({
  sampleType:     z.string().min(1, 'This field is required.').max(100).trim(),
  source:         z.string().min(1, 'This field is required.').max(200).trim(),
  collectionDate: z.string().datetime({ message: 'Invalid date format.' }),
  description:    z.string().max(2000).trim().optional(),
  experimentType: z.string().max(100).trim().optional(),
});

export const updateSampleSchema = z.object({
  description:    z.string().max(2000).trim().optional(),
  experimentType: z.string().max(100).trim().optional(),
  // sampleType, source, collectionDate are editable but not required on update
  sampleType:     z.string().min(1).max(100).trim().optional(),
  source:         z.string().min(1).max(200).trim().optional(),
  collectionDate: z.string().datetime().optional(),
});

export const updatePhaseSchema = z.object({
  phase: z.string().min(1, 'This field is required.').max(100).trim(),
});

export type CreateSampleInput = z.infer<typeof createSampleSchema>;
export type UpdateSampleInput = z.infer<typeof updateSampleSchema>;
export type UpdatePhaseInput  = z.infer<typeof updatePhaseSchema>;
```

```typescript
// lib/validators/team.ts
import { z } from 'zod';

export const updateRoleSchema = z.object({
  userId: z.string().cuid(),
  role:   z.enum(['ADMIN', 'RESEARCHER', 'STUDENT', 'VIEWER']),
});
```

---

## HTTP Methods and Status Codes

The agent must use these HTTP methods and status codes consistently across all routes.

### Methods

| Operation | HTTP Method | Example |
|---|---|---|
| Fetch a list | GET | `GET /api/samples` |
| Fetch a single record | GET | `GET /api/samples/[id]` |
| Create a record | POST | `POST /api/samples` |
| Full update | PUT | Not used in Labflow MVP |
| Partial update / soft delete | PATCH | `PATCH /api/samples/[id]` |
| Hard delete | DELETE | **Not used in Labflow — ever** |

### Status Codes

| Situation | Code | When to use |
|---|---|---|
| Successful GET | 200 | Record or list returned |
| Successful POST | 201 | New record created |
| Successful PATCH | 200 | Record updated |
| Missing or invalid input | 400 | Zod validation failed, missing required field |
| Unauthenticated | 401 | No session present |
| Permission denied | 403 | Session exists but role cannot perform this action |
| Resource not found | 404 | Sample ID not found, user not found |
| Conflict | 409 | Duplicate humanId, offline sync conflict |
| Rate limited | 429 | Too many requests — include `Retry-After` header |
| Unprocessable | 422 | Business rule violation (e.g. QR decode failed) |
| Server error | 500 | Unhandled exception — return safe fallback only |

---

## Lab Scoping Rule

Every database query that reads or writes user data must be scoped to `session.user.labId`. This is the primary data isolation boundary between labs.

```typescript
// ✅ Always scope to labId
const samples = await prisma.sample.findMany({
  where: {
    labId:     session.user.labId,   // REQUIRED
    isDeleted: false,
  },
  orderBy: { createdAt: 'desc' },
});

// ✅ Always verify the record belongs to this lab before updating
const sample = await prisma.sample.findUnique({
  where: { id },
});
if (!sample || sample.labId !== session.user.labId) {
  return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
}

// ❌ Never — fetches data across all labs
const samples = await prisma.sample.findMany();
```

---

## Every Labflow Route — Full Reference

### `POST /api/samples` — Create Sample

```typescript
// app/api/samples/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canPerformAction } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { writeAuditLog } from '@/lib/db/audit';
import { generateHumanId, generateSlug, generateSlugWithFallback } from '@/lib/id/generateId';
import { generateQRCodeUrl } from '@/lib/qr/goqr';
import { createSampleSchema } from '@/lib/validators/sample';

export async function POST(req: NextRequest) {
  try {
    // Step 1: Auth
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Step 2: Authorise
    if (!canPerformAction(session.user.role, 'create_sample')) {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    // Step 3: Validate
    const body = await req.json();
    const parsed = createSampleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // Step 4a: Generate humanId — scoped per lab per prefix
    const prefix = data.sampleType.trim().slice(0, 3).toUpperCase();
    const existingCount = await prisma.sample.count({
      where: { labId: session.user.labId, humanId: { startsWith: prefix } },
    });
    let sequence = existingCount + 1;
    let humanId = generateHumanId(data.sampleType, sequence);

    // Guard against rare race condition duplicates
    while (await prisma.sample.findUnique({ where: { humanId_labId: { humanId, labId: session.user.labId } } })) {
      sequence++;
      humanId = generateHumanId(data.sampleType, sequence);
    }

    // Step 4b: Generate slug — globally unique
    let slug = generateSlug(data.sampleType, humanId);
    if (await prisma.sample.findUnique({ where: { slug } })) {
      slug = generateSlugWithFallback(data.sampleType, humanId);
    }

    // Step 4c: Save sample
    const sample = await prisma.sample.create({
      data: {
        slug,
        humanId,
        sampleType:     data.sampleType,
        source:         data.source,
        collectionDate: new Date(data.collectionDate),
        description:    data.description,
        experimentType: data.experimentType,
        createdById:    session.user.id,
        labId:          session.user.labId,
      },
    });

    // Step 4d: Generate QR code — never block save if this fails
    const sampleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/samples/${sample.slug}`;
    try {
      const qrCodeUrl = await generateQRCodeUrl(sampleUrl);
      await prisma.sample.update({ where: { id: sample.id }, data: { qrCodeUrl } });
      sample.qrCodeUrl = qrCodeUrl;
    } catch (qrError) {
      console.error(`[QR Generation Failed] ${sample.slug}:`, qrError);
      // Continue — QR will be null until retry
    }

    // Step 5: Audit
    await writeAuditLog({
      userId:     session.user.id,
      actionType: 'CREATE',
      sampleId:   sample.id,
      ipAddress:  getIpAddress(req),
    });

    // Step 6: Respond
    return NextResponse.json(sample, { status: 201 });

  } catch (error) {
    console.error('[POST /api/samples]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}

// ─── GET /api/samples — List samples for the authenticated lab ─────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const humanId = searchParams.get('humanId');

    // Support humanId search (QR fallback)
    if (humanId) {
      const sample = await prisma.sample.findFirst({
        where: { humanId: humanId.toUpperCase(), labId: session.user.labId, isDeleted: false },
      });
      if (!sample) return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
      return NextResponse.json(sample, { status: 200 });
    }

    const samples = await prisma.sample.findMany({
      where: { labId: session.user.labId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(samples, { status: 200 });

  } catch (error) {
    console.error('[GET /api/samples]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}

// ─── Helper: extract IP address ──────────────────────────────────────────
function getIpAddress(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
```

---

### `GET /api/samples/[id]` — Fetch Single Sample

```typescript
// app/api/samples/[id]/route.ts

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sample = await prisma.sample.findUnique({
      where: { id: params.id },
    });

    // Must exist AND belong to the user's lab AND not be soft-deleted
    if (!sample || sample.labId !== session.user.labId || sample.isDeleted) {
      return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
    }

    return NextResponse.json(sample, { status: 200 });

  } catch (error) {
    console.error(`[GET /api/samples/${params.id}]`, error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
```

---

### `PATCH /api/samples/[id]` — Update or Soft Delete

```typescript
// app/api/samples/[id]/route.ts

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // Soft delete path
    if (body.isDeleted === true) {
      if (!canPerformAction(session.user.role, 'soft_delete_sample')) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
      }

      const sample = await prisma.sample.findUnique({ where: { id: params.id } });
      if (!sample || sample.labId !== session.user.labId) {
        return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
      }

      const updated = await prisma.sample.update({
        where: { id: params.id },
        data: { isDeleted: true, deletedAt: new Date(), deletedById: session.user.id },
      });

      await writeAuditLog({ userId: session.user.id, actionType: 'DELETE', sampleId: updated.id, ipAddress: getIpAddress(req) });
      return NextResponse.json(updated, { status: 200 });
    }

    // Restore path
    if (body.isDeleted === false) {
      if (!canPerformAction(session.user.role, 'restore_sample')) {
        return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
      }

      const updated = await prisma.sample.update({
        where: { id: params.id },
        data: { isDeleted: false, deletedAt: null, deletedById: null },
      });

      await writeAuditLog({ userId: session.user.id, actionType: 'RESTORE', sampleId: updated.id, ipAddress: getIpAddress(req) });
      return NextResponse.json(updated, { status: 200 });
    }

    // Standard field update path
    if (!canPerformAction(session.user.role, 'edit_sample')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const parsed = updateSampleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const sample = await prisma.sample.findUnique({ where: { id: params.id } });
    if (!sample || sample.labId !== session.user.labId || sample.isDeleted) {
      return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
    }

    const updated = await prisma.sample.update({
      where: { id: params.id },
      data: parsed.data,
    });

    await writeAuditLog({
      userId: session.user.id, actionType: 'UPDATE', sampleId: updated.id, ipAddress: getIpAddress(req),
    });

    return NextResponse.json(updated, { status: 200 });

  } catch (error) {
    console.error(`[PATCH /api/samples/${params.id}]`, error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
```

---

### `POST /api/samples/[id]/phases` — Add Experiment Phase

```typescript
// app/api/samples/[id]/phases/route.ts

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'update_phase')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updatePhaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const sample = await prisma.sample.findUnique({ where: { id: params.id } });
    if (!sample || sample.labId !== session.user.labId || sample.isDeleted) {
      return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
    }

    const previousPhase = sample.currentPhase;
    const newPhaseEntry = {
      phase:     parsed.data.phase,
      updatedBy: session.user.id,
      timestamp: new Date().toISOString(),
    };

    // Append to phase history JSON array
    const currentHistory = Array.isArray(sample.phaseHistory) ? sample.phaseHistory : [];
    const updated = await prisma.sample.update({
      where: { id: params.id },
      data: {
        currentPhase:  parsed.data.phase,
        phaseHistory:  [...currentHistory, newPhaseEntry],
      },
    });

    await writeAuditLog({
      userId:       session.user.id,
      actionType:   'PHASE_CHANGE',
      sampleId:     updated.id,
      fieldChanged: 'currentPhase',
      oldValue:     previousPhase ?? undefined,
      newValue:     parsed.data.phase,
      ipAddress:    getIpAddress(req),
    });

    return NextResponse.json(updated, { status: 200 });

  } catch (error) {
    console.error(`[POST /api/samples/${params.id}/phases]`, error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
```

---

### `POST /api/samples/[id]/images` — Attach Image

```typescript
// app/api/samples/[id]/images/route.ts

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'attach_image')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

    const ALLOWED = ['image/jpeg', 'image/png', 'image/tiff'];
    const MAX_BYTES = 10 * 1024 * 1024; // 10MB

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPEG, PNG, or TIFF image.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large. Maximum file size is 10MB.' }, { status: 400 });
    }

    const sample = await prisma.sample.findUnique({ where: { id: params.id } });
    if (!sample || sample.labId !== session.user.labId || sample.isDeleted) {
      return NextResponse.json({ error: 'This sample does not exist.' }, { status: 404 });
    }

    // Upload to Vercel Blob (or Cloudinary — swap out this block)
    const { put } = await import('@vercel/blob');
    const blob = await put(`${sample.labId}/${sample.id}/${Date.now()}-${file.name}`, file, { access: 'public' });

    const imageEntry = {
      filename:        file.name,
      uploaderId:      session.user.id,
      uploadTimestamp: new Date().toISOString(),
      url:             blob.url,
    };

    const currentImages = Array.isArray(sample.images) ? sample.images : [];
    const updated = await prisma.sample.update({
      where: { id: params.id },
      data: { images: [...currentImages, imageEntry] },
    });

    await writeAuditLog({
      userId:       session.user.id,
      actionType:   'IMAGE_ATTACH',
      sampleId:     updated.id,
      newValue:     blob.url,
      ipAddress:    getIpAddress(req),
    });

    return NextResponse.json({ image: imageEntry }, { status: 201 });

  } catch (error) {
    console.error(`[POST /api/samples/${params.id}/images]`, error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
```

---

### `GET /api/audit` — Activity Log (Admin Only)

```typescript
// app/api/audit/route.ts

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'view_audit_log')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId   = searchParams.get('userId')   ?? undefined;
    const fromDate = searchParams.get('from')      ?? undefined;
    const toDate   = searchParams.get('to')        ?? undefined;

    const logs = await prisma.auditLog.findMany({
      where: {
        user: { labId: session.user.labId },     // scope to lab via relation
        ...(userId   ? { userId }               : {}),
        ...(fromDate ? { timestamp: { gte: new Date(fromDate) } } : {}),
        ...(toDate   ? { timestamp: { lte: new Date(toDate)   } } : {}),
      },
      include: {
        user:   { select: { id: true, name: true, email: true, role: true } },
        sample: { select: { id: true, slug: true, humanId: true, sampleType: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 500, // paginate post-MVP
    });

    return NextResponse.json(logs, { status: 200 });

  } catch (error) {
    console.error('[GET /api/audit]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
```

---

### `GET + PATCH /api/team` — Team Role Management (Admin Only)

```typescript
// app/api/team/route.ts

// GET — list team members
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'manage_roles')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const members = await prisma.user.findMany({
      where:  { labId: session.user.labId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLogin: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(members, { status: 200 });

  } catch (error) {
    console.error('[GET /api/team]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}

// PATCH — update a team member's role or deactivate them
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!canPerformAction(session.user.role, 'manage_roles')) {
      return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    // Verify target user belongs to this lab
    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target || target.labId !== session.user.labId) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where:  { id: parsed.data.userId },
      data:   { role: parsed.data.role },
      select: { id: true, name: true, email: true, role: true },
    });

    // Team role changes must write to AuditLog (AGENTS.md §8.8).
    // The current schema requires sampleId to reference a valid Sample.
    // Tracked for post-MVP: make sampleId optional in AuditLog schema,
    // or create a lab-level audit table for non-sample actions.
    // await writeAuditLog({
    //   userId:       session.user.id,
    //   actionType:   'UPDATE',   // requires a new ActionType e.g. ROLE_CHANGE
    //   fieldChanged: 'role',
    //   oldValue:     target.role,
    //   newValue:     parsed.data.role,
    //   ipAddress:    getIpAddress(req),
    // });

    return NextResponse.json(updated, { status: 200 });

  } catch (error) {
    console.error('[PATCH /api/team]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again later.' }, { status: 500 });
  }
}
```

---

## Common Mistakes — Never Do These

| Mistake | Why it is wrong | What to do instead |
|---|---|---|
| Skipping Step 1 (auth check) | Any unauthenticated request can execute DB operations | Always call `auth()` as the first operation |
| Skipping Step 2 (role check) | Users can perform actions outside their role | Always call `canPerformAction()` before the DB query |
| Forgetting `labId` in queries | Data leaks across labs | Every query on Sample, User, AuditLog must include `labId: session.user.labId` |
| Using `prisma.sample.delete()` | Hard deletes destroy data permanently | Always use soft delete: `update({ data: { isDeleted: true } })` |
| Exposing `error.message` in the response | Leaks DB structure, stack traces, and Prisma internals | Always return `"Something went wrong. Please try again later."` |
| Writing audit log before the DB operation | If the DB write fails, the audit log is wrong | Always write audit log after the DB operation succeeds |
| Letting audit log failure crash the route | A log write failure should not break the user's action | `writeAuditLog` catches its own errors internally |
| Calling goQR before saving the sample | goQR failure would prevent the sample from being saved | Always save the sample first, then call goQR |
| Using `req.json()` without safeParse | Unvalidated input goes straight to the DB | Always validate with Zod's `safeParse()` before touching the DB |
| Calling `prisma.auditLog.update()` or `.delete()` | AuditLog is append-only | Never update or delete audit log entries — ever |
| Forgetting rate limits on auth endpoints | Credential stuffing attacks go unmitigated | Add `checkRateLimit(req, endpoint)` before Step 1 (see `security.md §5`) |
