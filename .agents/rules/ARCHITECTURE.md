# ARCHITECTURE.md — Labflow System Architecture

> This file describes the full system architecture of Labflow. The agent must read this before creating any file, folder, route, or component.
>
> **Sibling files:** See also `security.md` (auth, permissions, data isolation), `code-style.md` (TypeScript, naming, patterns), `design-system.md` (tokens, CSS Modules), and `AGENTS.md` (business rules, user flows, edge cases).

---

## 1. Stack Overview

Labflow is a Next.js application using the App Router, written in TypeScript (strict mode), backed by PostgreSQL through Prisma. Styling is handled by CSS Modules consuming `tokens/design-tokens.css` design tokens. There is no separate backend service — everything lives in the Next.js app, using server components and route handlers.

---

## 2. Project Folder Structure

```
labflow/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard shell with nav
│   │   ├── page.tsx              # Dashboard home
│   │   ├── samples/
│   │   │   ├── page.tsx          # Sample list view
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # New sample form
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Sample detail view
│   │   │       └── edit/
│   │   │           └── page.tsx  # Edit sample
│   │   ├── scan/
│   │   │   └── page.tsx          # QR code scanner
│   │   ├── activity/
│   │   │   └── page.tsx          # Audit log (PI/Admin only)
│   │   └── settings/
│   │       ├── page.tsx          # Lab settings
│   │       └── team/
│   │           └── page.tsx      # Team role management
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts
│       ├── samples/
│       │   ├── route.ts          # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts      # GET, PATCH (update / soft delete / restore)
│       │       ├── phases/
│       │       │   └── route.ts  # POST (add phase)
│       │       └── images/
│       │           └── route.ts  # POST (attach image)
│       ├── qr/
│       │   └── read/
│       │       └── route.ts      # POST (decode QR from uploaded image)
│       ├── audit/
│       │   └── route.ts          # GET (audit log, PI only)
│       └── team/
│           └── route.ts          # GET, PATCH (role management)
├── components/
│   ├── ui/                       # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Badge.tsx
│   │   └── EmptyState.tsx
│   ├── samples/
│   │   ├── SampleForm.tsx        # Core logging form
│   │   ├── SampleCard.tsx
│   │   ├── SampleDetail.tsx
│   │   ├── PhaseTracker.tsx
│   │   └── ImageAttachment.tsx
│   ├── qr/
│   │   ├── QRDisplay.tsx         # Shows QR code image
│   │   └── QRScanner.tsx         # Camera-based scanner
│   ├── audit/
│   │   └── ActivityLog.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── BottomNav.tsx         # Mobile navigation
│       └── SyncStatus.tsx        # Offline/sync indicator
├── lib/
│   ├── db/
│   │   ├── client.ts             # Prisma client singleton
│   │   ├── samples.ts            # Sample queries
│   │   ├── audit.ts              # Audit log queries
│   │   ├── users.ts              # User queries
│   │   └── labs.ts               # Lab queries
│   ├── qr/
│   │   └── goqr.ts               # goQR API wrapper
│   ├── offline/
│   │   └── syncQueue.ts          # IndexedDB sync queue manager
│   ├── auth/
│   │   └── permissions.ts        # Role permission checks
│   ├── id/
│   │   └── generateId.ts         # Human-readable ID generator
│   ├── validators/
│   │   └── sample.ts             # Input validation schemas
│   └── utils.ts                  # Shared utilities (cn, etc.)
├── hooks/
│   ├── useSyncQueue.ts           # Offline sync hook
│   ├── usePermissions.ts         # Role-aware permission hook
│   └── useToast.ts               # Toast notification hook
├── types/
│   └── index.ts                  # Shared TypeScript types
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
└── middleware.ts                 # Auth guard for page routes only
```

---

## 3. Data Flow

### 3.1 Sample Creation (Online)

```
User fills SampleForm
    → Client validates required fields (block if incomplete)
    → POST /api/samples
        → Server validates fields with Zod
        → Server checks duplicate humanId per lab
        → Server generates humanId and slug
        → Server saves sample to PostgreSQL
        → Server calls goQR API → stores qrCodeUrl (failure does not block)
        → Server writes audit log entry (action: CREATE) with ipAddress
        → Server returns sample record
    → Client shows toast: "Sample [humanId] saved."
    → Client navigates to /samples/[id]
```

Duplicate detection is handled server-side — the `@@unique([humanId, labId])` schema constraint prevents duplicates per lab. No pre-submission client-side check is needed (it would add latency without value).

### 3.2 Sample Creation (Offline)

```
User fills SampleForm (no connectivity)
    → Client validates required fields locally
    → Client queues action in IndexedDB sync queue
    → Client shows "Saved offline. Will sync when connected."
    → On reconnect:
        → syncQueue processes queued actions FIFO
        → POST /api/samples for each queued item
        → Server assigns permanent humanId/slug and generates QR
        → Client replaces local ID with permanent ID
        → Client shows "All records synced."
    → On conflict (409): surface diff to user — never auto-resolve
    → After 3 retry failures: show manual retry button
```

### 3.3 QR Code Generation

```
Server receives confirmed sample save
    → lib/qr/goqr.ts constructs GET request:
        https://api.qrserver.com/v1/create-qr-code/
        ?data=[URL-encoded sample URL]
        &size=300x300
        &format=png
        &ecc=M
        &qzone=4
        &margin=1
        &color=0-0-0
        &bgcolor=255-255-255
        &charset-source=UTF-8
        &charset-target=UTF-8
    → Store returned image URL in sample.qrCodeUrl
    → If goQR call fails: log server-side, queue retry, do NOT block sample save
    → QR code is generated once and never regenerated
```

---

## 4. Authentication and Session Flow

```
User visits any protected page route
    → middleware.ts checks for valid NextAuth session
    → If no session: redirect to /login
    → If session exists: pass session to the page component
```

**Critical — API routes must self-authenticate.** Do not rely on `middleware.ts` to protect API routes. Middleware only protects page routes. Every API route must call `auth()` as its first operation:

```
API route receives request
    → Step 1: Call auth() to verify session
    → Step 2: Check role via canPerformAction()
    → Step 3: Execute business logic (all queries scoped to session.user.labId)
```

See `security.md` §2.3 for the full policy.

---

## 5. Role Enforcement Architecture

Role checks happen at **two layers**:
1. **Middleware** (`middleware.ts`) — blocks unauthenticated access to protected page routes
2. **API route level** (`lib/auth/permissions.ts`) — checks role before any database operation

UI conditionally renders actions based on role, but UI-level hiding is a UX convenience only — **it is not a security control**. All security enforcement is server-side.

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
  | 'view_all_samples'
  | 'view_audit_log'
  | 'export_audit_log'
  | 'manage_roles'
  | 'edit_lab_settings';

const PERMISSIONS: Record<Action, Role[]> = {
  create_sample:      ['ADMIN', 'RESEARCHER', 'STUDENT'],
  edit_sample:        ['ADMIN', 'RESEARCHER', 'STUDENT'],
  soft_delete_sample: ['ADMIN'],
  restore_sample:     ['ADMIN'],
  update_phase:       ['ADMIN', 'RESEARCHER', 'STUDENT'],
  attach_image:       ['ADMIN', 'RESEARCHER', 'STUDENT'],
  view_all_samples:   ['ADMIN', 'RESEARCHER', 'VIEWER'],
  view_audit_log:     ['ADMIN'],
  export_audit_log:   ['ADMIN'],
  manage_roles:       ['ADMIN'],
  edit_lab_settings:  ['ADMIN'],
};

export function canPerformAction(role: Role, action: Action): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}
```

See `AGENTS.md` §13 for the full role-permission matrix and `security.md` §3 for the complete security policy.

---

## 6. Offline Sync Architecture

- **Storage:** IndexedDB via a `syncQueue` manager (`lib/offline/syncQueue.ts`)
- **Queue structure:** Each queued item stores `{ action, payload, timestamp, retryCount }`
- **Trigger:** `navigator.onLine` event listener + periodic check
- **Processing:** Queue is processed FIFO on reconnect
- **Conflict detection:** If server returns 409 (same record edited by two users offline), surface the diff to the user — do not auto-resolve
- **Retry limit:** 3 automatic retries per item before surfacing a manual retry option

---

## 7. Rate Limiting

Authentication endpoints must be rate-limited to prevent brute-force attacks:

| Endpoint | Limit |
|---|---|
| Login | 5 attempts per IP per minute |
| Signup | 3 attempts per IP per minute |

Implement via middleware or a helper function. See `security.md` §5 for details.

---

## 8. Database Schema Overview

```
labs
 └── users (many users belong to one lab)
      └── samples (many samples created by one user, belong to one lab)
           ├── phase_history (JSON array of phase objects within sample record)
           ├── images (JSON array of image objects within sample record)
           └── audit_logs (append-only table — never UPDATE or DELETE)
```

---

## 9. goQR API Integration

All goQR calls are centralised in one file: `lib/qr/goqr.ts`

**Rules:**
- Construct the goQR GET URL with correct parameters (see §3.3)
- Always URL-encode the `data` parameter — use `URLSearchParams`
- Return the image URL on success
- Throw a typed error on failure (caught by the caller, which queues a retry)
- Never be called directly from a React component — only from API routes
- Never regenerate a QR code for an existing sample

See the `goqr-integration` skill for the complete reference.

---

## 10. Image Storage

- Images are uploaded via `POST /api/samples/[id]/images`
- Accepted formats: JPEG, PNG, TIFF — validated by MIME type, not extension
- Maximum file size: 10MB per image
- Images are stored in **Vercel Blob** (or Cloudinary free tier) — never in `/public/`
- Image URLs are stored in the `images` JSON array on the sample record
- Each image entry stores: `filename`, `uploaderId`, `uploadTimestamp`, `url`
- Images are never overwritten — all versions are retained
- Storage keys are generated server-side — never trust user-supplied filenames

See `security.md` §8 for file upload security rules.

---

## 11. Server vs Client Components

| Type | When to use | Example |
|---|---|---|
| **Server Component** (default) | Fetching data, no interactivity, static content | Page layouts, sample detail views, list pages |
| **Client Component** (`'use client'`) | useState, useEffect, event handlers, browser APIs, form state | SampleForm, QRScanner, Modal, Toast |

- Pages are Server Components by default
- Add `'use client'` only when interactivity is required — never proactively
- Client components should be leaf nodes in the component tree where possible

See `code-style.md` §4 and the `component-builder` skill for full conventions.

---

## 12. Confirmation Modals

Confirmation modals (using `components/ui/Modal.tsx`) are required for these actions and no others:

| Action | Modal Message |
|---|---|
| Update experiment phase | `"Set phase to [X]? This cannot be undone."` |
| Archive (soft delete) a sample | `"Archive this sample? It can be restored later."` |
| Restore a sample | `"Restore sample [humanId]?"` |
| Remove a team member | `"Remove [name] from your lab? Their samples will remain."` |
| Change a team member's role | `"Change [name]'s role to [X]?"` |

**Do NOT add confirmation modals to:** sample creation, image attachment, phase viewing, or any read-only action. See `AGENTS.md` §11 for the full policy.

---

## 13. Error Handling

Every API route must return safe, generic error messages. Never expose internal details:

```typescript
try {
  // business logic
} catch (error) {
  console.error('[POST /api/resource]', error);  // full error in server logs
  return NextResponse.json(
    { error: 'Something went wrong. Please try again later.' },
    { status: 500 }
  );
}
```

**Rules:**
- Never expose `error.message`, stack traces, Prisma errors, or database details to the client
- Auth errors must not distinguish between "user not found" and "wrong password" — always return `"Invalid email or password."`
- All async functions must be wrapped in `try/catch`
- All user-facing error messages must match the exact strings in `AGENTS.md` §12

See `security.md` §10 for full error-handling rules.

---

## 14. Design System

- **Styling method:** CSS Modules (`.module.css` files) — no Tailwind, no inline styles
- **Design tokens:** All CSS values come from `tokens/design-tokens.css` — never hardcode colors, fonts, or spacing
- **Spacing scale:** Multiples of 4px (4, 8, 12, 16, 24, 32, 48, 64)
- **Border radius:** 4px (badges), 8px (buttons/inputs), 12px (cards/modals)
- **Mobile-first:** Default styles target 375px viewport; `@media (min-width: 768px)` for desktop
- **Touch targets:** Minimum 44px × 44px for all interactive elements

See `design-system.md` and `tokens/design-tokens.css` for the complete reference.

---

## 15. Key Design Constraints

- No infrastructure setup required from end users
- No desktop-only flows — every screen must be functional at 375px viewport width
- No multi-step wizards for the sample logging flow
- No permanent delete operations anywhere in the codebase — soft delete only
- All audit log writes are append-only — no updates or deletes on the `audit_logs` table
- QR codes are generated once and stored — never regenerated for an existing sample
- Every database query must be scoped to `session.user.labId` — data never crosses lab boundaries
- Every user input must be validated with Zod server-side — not just on the client
- No hardcoded secrets — every credential comes from `process.env`
- Team member deactivation is soft: `isActive = false`, never delete the user record
