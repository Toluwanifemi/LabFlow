---
trigger: always_on
---

These rules govern every security decision in the Labflow codebase.
The agent must read and apply this file before building any API route, auth flow, database query, or form handler.
Security is non-negotiable. No rule in this file may be bypassed for convenience or speed.

---

## 1. Core Security Principles

1. **Trust nothing from the client** — validate and sanitise all input server-side, always. Client-side validation is a UX convenience, not a security control.
2. **Least privilege** — every user gets the minimum access required to do their job. Nothing more.
3. **Defence in depth** — security is enforced at multiple layers: middleware, API routes, and the database. Defeating one layer must not defeat the others.
4. **Fail closed** — when in doubt, deny. Default to refusing access, not granting it.
5. **No silent failures** — every security event (failed auth, permission denied, validation error) is logged server-side.

---

## 2. Authentication

### 2.1 Password & Session Rules

Passwords are hashed with **bcrypt** before they hit the database. Never store plaintext passwords. Never log passwords, even during debugging.

Sessions are cookie-based. Cookies must have:
- `httpOnly: true`
- `secure: true` in production
- `sameSite: 'lax'`
- A reasonable expiration (30 days is the default)

Session tokens are random, unguessable, and at least 32 bytes of entropy. Use the Node `crypto` module's `randomBytes`, not `Math.random`.

Logout invalidates the session on the server side by deleting the session record, not just the cookie. A stolen cookie is useless if the server no longer recognizes its token.

### 2.2 Route Protection

All authenticated routes are protected by `middleware.ts`:

Rules:
- Middleware protects pages — but API routes must also check for valid sessions independently
- Never assume that because a page is protected, its API route is also protected
- Every API route must call `auth()` as its first operation (NextAuth.js v5 — do not use the deprecated `getServerSession()`)

```typescript
// ✅ Correct — NextAuth.js v5
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}

// ❌ Never — getServerSession is deprecated in NextAuth v5
import { getServerSession } from 'next-auth';
```

---

## 3. Input Validation

Every piece of data that enters the application from outside must be validated with **Zod** before it touches the database or any business logic. This applies to:
- Form submissions
- Route handler request bodies
- URL parameters and query strings
- Webhook payloads
- File uploads

Validation is not optional and is not the frontend's job. The frontend can validate for user experience, but the server validates for safety.

See `code-style.md §5` for the complete route validation pattern (Zod `safeParse`, typed error returns, lab scoping).

---

## 4. SQL Injection Prevention

All database access goes through Prisma. Prisma uses parameterized queries by default, which prevents SQL injection as long as you do not bypass it. Never use `prisma.$queryRawUnsafe` or string-concatenate SQL. If you need raw SQL, use `prisma.$queryRaw` with a tagged template, which parameterizes correctly.

---

## 5. Rate Limiting

### 5.1 Limits

| Endpoint | Limit | Reason |
|---|---|---|
| `POST /api/auth/login` | 5 attempts per IP per minute | Slow credential stuffing |
| `POST /api/auth/signup` | 3 attempts per IP per minute | Prevent account creation abuse |
| `POST /api/auth/reset-password` | 2 requests per IP per minute | Prevent email bomb abuse |

### 5.2 Implementation (Upstash)

Use **Upstash Ratelimit** with **Upstash Redis** (Vercel-integrated, serverless-friendly).

**Install:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Environment variables:**
```bash
# .env.local (or Vercel dashboard)
UPSTASH_REDIS_REST_URL="https://your-region.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

**Rate limit helper (`lib/rate-limit.ts`):**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimits = {
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: true,
    prefix: 'ratelimit:login',
  }),
  signup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '60 s'),
    analytics: true,
    prefix: 'ratelimit:signup',
  }),
  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, '60 s'),
    analytics: true,
    prefix: 'ratelimit:password-reset',
  }),
};

type RateLimitEndpoint = keyof typeof ratelimits;

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '127.0.0.1';
}

export async function checkRateLimit(
  req: NextRequest,
  endpoint: RateLimitEndpoint
): Promise<{ allowed: boolean; remaining: number }> {
  const ip = getClientIp(req);
  const { success, remaining } = await ratelimits[endpoint].limit(ip);
  return { allowed: success, remaining };
}
```

**Usage in API routes:**
```typescript
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const { allowed, remaining } = await checkRateLimit(req, 'login');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    );
  }
  // ... proceed with login
}
```

**Upstash is preferred because:**
- Serverless-friendly (no persistent connection, HTTP-based)
- Vercel Marketplace integration (one-click provision)
- Sliding window algorithm (no burst bypass)
- Built-in analytics dashboard

---

## 6. Logging

Log enough context to debug an incident, never enough to leak user data.

- Log request method, path, status, duration, and a request ID.
- Log user ID (not email, not name) when relevant.
- Log error stacks on the server.
- Never log: passwords, session tokens, full card numbers, CVVs, secret keys, webhook secrets, email unless required for incident response.

---

## 7. Dependencies

Every dependency is a potential vulnerability. Keep the list small. Run `npm audit` regularly. When a vulnerability is reported, update the package within a week unless the vulnerability does not affect our use case.

Do not install packages with fewer than a few thousand weekly downloads or no recent commits unless the developer approves.

---

## 8. Incident Response

If a secret is exposed (committed by accident, leaked in a log, shared in a screenshot), rotate it immediately. The order is:

1. Rotate the secret at the provider (database, Vercel Blob, Upstash, Resend).
2. Update the environment variable in production.
3. Deploy.
4. Revoke the old secret.
5. Tell the developer what happened and when, in writing.

Do not try to hide a leak. Fast, honest response limits damage.

---

## 9. Authorisation (Role-Based Access Control)

### 9.1 Permission Check Pattern

Every API route must check role before executing any database operation:

```typescript
// lib/auth/permissions.ts
import { Role } from '@/types';

type Action =
  | 'create_sample'
  | 'edit_sample'
  | 'soft_delete_sample'
  | 'restore_sample'
  | 'update_phase'
  | 'attach_image'
  | 'view_own_samples'
  | 'view_all_samples'
  | 'view_audit_log'
  | 'export_audit_log'
  | 'manage_roles'
  | 'edit_lab_settings';

const PERMISSIONS: Record<Action, Role[]> = {
  create_sample:       ['ADMIN', 'RESEARCHER', 'STUDENT'],
  edit_sample:         ['ADMIN', 'RESEARCHER', 'STUDENT'],
  soft_delete_sample:  ['ADMIN'],
  restore_sample:      ['ADMIN'],
  update_phase:        ['ADMIN', 'RESEARCHER', 'STUDENT'],
  attach_image:        ['ADMIN', 'RESEARCHER', 'STUDENT'],
  view_own_samples:    ['ADMIN', 'RESEARCHER', 'STUDENT', 'VIEWER'],
  view_all_samples:    ['ADMIN', 'RESEARCHER', 'VIEWER'],
  view_audit_log:      ['ADMIN'],
  export_audit_log:    ['ADMIN'],
  manage_roles:        ['ADMIN'],
  edit_lab_settings:   ['ADMIN'],
};

export function canPerformAction(role: Role, action: Action): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}
```

**Usage:**
```typescript
// Use view_own_samples for a user's "My Samples" list
// Use view_all_samples for the lab-wide sample browser
```

### 9.2 Lab Scoping

Every database query on user data must be scoped to the authenticated user's `labId`:

```typescript
// ✅ Correct — always scope to labId
const samples = await prisma.sample.findMany({
  where: {
    labId: session.user.labId,   // REQUIRED on every query
    isDeleted: false,
  }
});

// ❌ Never do this — fetches data across all labs
const samples = await prisma.sample.findMany();
```

**Rules:**
- Every query on `Sample`, `User`, and `AuditLog` must include `labId: session.user.labId`
- A user from Lab A must never be able to read, write, or delete data from Lab B
- Lab scoping is enforced at the query level — not just in the API route handler

See also `code-style.md §6.1` for the complete lab scoping rules.

---

## 10. API Security

### 10.1 HTTP Method Enforcement

Every API route must only respond to the HTTP methods it explicitly handles:

```typescript
// app/api/samples/route.ts
export async function GET(req: NextRequest) { ... }   // allowed
export async function POST(req: NextRequest) { ... }  // allowed
// PUT, PATCH, DELETE not exported = Next.js returns 405 automatically
```

### 10.2 CORS

Labflow is a same-origin app deployed on Vercel. Do not configure custom CORS headers unless explicitly building a public API endpoint.

### 10.3 Response Headers

Next.js on Vercel sets secure headers automatically. The following must be confirmed in `next.config.ts`:

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=self' },
          // camera=self is required for the QR scanner feature
        ],
      },
    ];
  },
};
```

---

## 11. Environment Variable Security

```typescript
// ✅ Correct — read from environment
const dbUrl = process.env.DATABASE_URL;

// ❌ Never — hardcoded secrets
const dbUrl = 'postgresql://user:password@host:5432/labflow';
```

**Rules:**
- Never commit `.env.local` — it is in `.gitignore`
- Always commit `.env.example` with empty values as a template
- `NEXT_PUBLIC_*` variables are exposed to the browser — never put secrets in them
- Only `NEXT_PUBLIC_APP_URL` should use the `NEXT_PUBLIC_` prefix in Labflow
- Rotate `NEXTAUTH_SECRET` immediately if it is ever accidentally committed or exposed
- On Vercel, set all secrets via the dashboard — never via a committed config file

---

## 12. File Upload Security

Applied to image attachments via `POST /api/samples/[id]/images`:

```typescript
// Validation rules for uploaded files
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/tiff'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function validateUpload(file: File): Promise<void> {
  // 1. Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError('Image too large. Maximum file size is 10MB.');
  }

  // 2. Check MIME type from the file header — not just the filename extension
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ValidationError('Unsupported file type. Please upload a JPEG, PNG, or TIFF image.');
  }

  // 3. Never trust the filename — sanitise it before storage
  // Use a UUID or hash as the storage key — not the original filename
}
```

**Rules:**
- Validate file type using MIME type — not file extension (extensions can be spoofed)
- Never store files using the user-supplied filename — generate a safe storage key
- Store images outside the web root or in object storage (Vercel Blob / Cloudinary) — never in `/public/`
- Never execute uploaded files under any circumstance

---

## 13. Audit Log Security

The audit log is a security record, not just a feature. Its integrity must be guaranteed.

**Rules:**
- The `AuditLog` table has no `UPDATE` or `DELETE` Prisma operations — ever
- The Prisma schema must not include cascade delete on `AuditLog`
- The database user/role used by the application must have `INSERT` and `SELECT` on `AuditLog` only — no `UPDATE` or `DELETE`
- Audit log entries must never be filtered from admin views — the full log must always be visible to ADMIN users
- Log entries must include `ipAddress` — extract it from the request headers:

```typescript
function getIpAddress(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
}
```

---

## 14. Error Handling and Information Disclosure

### 14.1 Safe Error Responses

```typescript
// ✅ Correct — safe fallback, details logged server-side only
} catch (error) {
  console.error('[POST /api/samples]', error); // full error in server logs
  return NextResponse.json(
    { error: 'Something went wrong. Please try again later.' },
    { status: 500 }
  );
}

// ❌ Never — exposes internal details
} catch (error) {
  return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
}
```

### 14.2 Consistent Error Messages for Auth Failures

Do not distinguish between "user not found" and "wrong password" in error messages — both must return the same message to prevent user enumeration:

```typescript
// ✅ Correct — attacker cannot determine if email exists
return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });

// ❌ Never — reveals whether the email exists in the system
return NextResponse.json({ error: 'No account found with this email.' }, { status: 401 });
```

All error messages must use the exact strings defined in `AGENTS.md §12`.

---

## 15. Security Checklist

Before marking any feature complete, the agent must verify:

- [ ] All API routes check for a valid session before executing
- [ ] All API routes enforce role permissions via `canPerformAction()`
- [ ] All database queries are scoped to `labId: session.user.labId`
- [ ] All user inputs are validated with a Zod schema
- [ ] `passwordHash` is never returned in any API response
- [ ] No hardcoded secrets anywhere in the codebase
- [ ] No raw SQL string interpolation — Prisma only
- [ ] File uploads validate MIME type and file size before storage
- [ ] No hard deletes — soft delete only
- [ ] Audit log is append-only — no update or delete operations
- [ ] All error responses use safe fallback messages — no stack traces exposed
- [ ] Auth failures return identical messages regardless of failure reason
- [ ] `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` headers are set
- [ ] Rate limits are applied to login, signup, and password reset endpoints
- [ ] Rate limit returns 429 with `Retry-After` header on block

---

## 16. Cross-References

| Topic | File |
|---|---|
| Route validation pattern (Zod `safeParse`, typed returns) | `code-style.md §5` |
| Lab scoping rules in database queries | `code-style.md §6.1` |
| Authentication endpoints and session management | `ARCHITECTURE.md §2` |
| Rate limiting endpoint mapping | `ARCHITECTURE.md §7` |
| Exact error message strings | `AGENTS.md §12` |
| Role permission matrix | `AGENTS.md §13` |
| Route scaffolder skill (6-step API route template) | `skills/api-route-scaffolder/SKILL.md` |
| Upstash Redis setup | Vercel dashboard → Storage → Upstash Redis |
