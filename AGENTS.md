# AGENTS.md — Labflow AI Agent Instructions

> This is the single source of truth for the Antigravity AI agent building Labflow.
> Read this entire file before writing any code, creating any file, or making any decision.
> Every section is mandatory. No section may be skipped.

---

## 1. Project Description

**Product name** Labflow
**Type:** Mobile-first web application
**Purpose:** Enable scientists in Nigeria and across Africa to log biological samples, track experiment phases, and maintain immutable audit records — with maximum simplicity and minimum friction.

Labflow is inspired by tools like Benchling and LabArchives but built specifically for:
- Researchers operating on low-bandwidth or intermittent internet connections
- Non-technical users who need to log samples mid-experiment, often on a phone, sometimes with one hand
- Institutions in Nigeria and Sub-Saharan Africa that need digital audit trails for ethics boards and grant reporting

The product is not a full LIMS. It is an opinionated, fast, mobile-first sample logger with audit, QR, and role features built in. Every decision must protect that simplicity.

**Design goal:** A researcher can log a new sample in under 60 seconds. No wizard. No multi-page form. One screen, one tap.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Full-stack — handles both frontend and API routes |
| Frontend | React 18+ | Functional components only, TypeScript strict mode |
| Database | PostgreSQL | Hosted on a managed provider (e.g. Neon, Supabase DB, Railway) |
| ORM | Prisma | Schema defined in `prisma/schema.prisma` |
| Auth | NextAuth.js v5 | Email + password (Credentials provider). Magic link via SMTP post-MVP |
| Email | SMTP (free tier) | Use Resend Configure via env vars |
| QR Codes | goQR API | `https://api.qrserver.com/v1/create-qr-code/` — no API key required |
| Offline Storage | IndexedDB | Managed via `idb` npm package in `lib/offline/syncQueue.ts` |
| Hosting | Vercel | Deploy via Vercel. Use Vercel environment variables for all secrets |
| Styling | CSS Modules + CSS custom properties (design tokens) | Mobile-first layout. No Tailwind CSS. |
| Image Storage | Vercel Blob | Or Cloudinary free tier. Never store images in PostgreSQL |

---

## 3. Folder Structure

The agent must follow this exact structure. Do not create files or folders outside of it without explicit instruction.

```
labflow/
├── app/                                  # Next.js App Router root
│   ├── (auth)/                           # Unauthenticated routes group
│   │   ├── login/
│   │   │   └── page.tsx                  # Login page
│   │   └── signup/
│   │       └── page.tsx                  # Signup / lab registration page
│   ├── (dashboard)/                      # Authenticated routes group
│   │   ├── layout.tsx                    # Dashboard shell: nav + sync status bar
│   │   ├── page.tsx                      # Dashboard home — recent samples + quick log CTA
│   │   ├── samples/
│   │   │   ├── page.tsx                  # Sample list view
│   │   │   ├── new/
│   │   │   │   └── page.tsx              # New sample form (critical path)
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Sample detail view
│   │   │       └── edit/
│   │   │           └── page.tsx          # Edit sample fields
│   │   ├── scan/
│   │   │   └── page.tsx                  # QR code scanner (camera)
│   │   ├── activity/
│   │   │   └── page.tsx                  # Audit log — PI/Admin only
│   │   └── settings/
│   │       ├── page.tsx                  # Lab settings
│   │       └── team/
│   │           └── page.tsx              # Team role management
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts              # NextAuth.js handler
│       ├── samples/
│       │   ├── route.ts                  # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts              # GET, PATCH, DELETE (soft only)
│       │       ├── phases/
│       │       │   └── route.ts          # POST (add phase update)
│       │       └── images/
│       │           └── route.ts          # POST (attach image)
│       ├── qr/
│       │   └── read/
│       │       └── route.ts              # POST (decode QR from uploaded image)
│       ├── audit/
│       │   └── route.ts                  # GET (audit log — PI only)
│       └── team/
│           └── route.ts                  # GET, POST, PATCH (role management)
│
├── components/
│   ├── ui/                               # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx                     # Used for all confirmation dialogs
│   │   ├── Toast.tsx                     # Used for all user feedback messages
│   │   ├── Badge.tsx                     # Role badge, phase badge
│   │   └── EmptyState.tsx                # Empty list states
│   ├── samples/
│   │   ├── SampleForm.tsx                # Core logging form — must stay lean
│   │   ├── SampleCard.tsx                # List item card
│   │   ├── SampleDetail.tsx              # Full sample record view
│   │   ├── PhaseTracker.tsx              # Phase history + update control
│   │   └── ImageAttachment.tsx           # Image upload + gallery
│   ├── qr/
│   │   ├── QRDisplay.tsx                 # Renders QR code image from URL
│   │   └── QRScanner.tsx                 # Camera-based QR scanner
│   ├── audit/
│   │   └── ActivityLog.tsx               # Audit log table component
│   └── layout/
│       ├── Navbar.tsx                    # Top nav (desktop)
│       ├── BottomNav.tsx                 # Bottom nav (mobile)
│       └── SyncStatus.tsx                # Offline / syncing / synced indicator
│
├── lib/
│   ├── db/
│   │   ├── client.ts                     # Prisma client singleton
│   │   ├── samples.ts                    # All sample-related DB queries
│   │   ├── audit.ts                      # Audit log DB queries (append-only)
│   │   ├── users.ts                      # User DB queries
│   │   └── labs.ts                       # Lab DB queries
│   ├── qr/
│   │   └── goqr.ts                       # goQR API wrapper — only place goQR is called
│   ├── offline/
│   │   └── syncQueue.ts                  # IndexedDB sync queue manager
│   ├── auth/
│   │   └── permissions.ts                # Role permission check functions
│   ├── id/
│   │   └── generateId.ts                 # Sample ID & slug generation logic
│   ├── email/
│   │   └── mailer.ts                     # SMTP email sender (Resend or Brevo)
│   └── validators/
│       └── sample.ts                     # Zod validation schemas for sample inputs
│
├── hooks/
│   ├── useSyncQueue.ts                   # Offline sync state and trigger hook
│   ├── usePermissions.ts                 # Role-aware permission check hook
│   └── useToast.ts                       # Toast notification trigger hook
│
├── types/
│   └── index.ts                          # All shared TypeScript interfaces and types
│
├── prisma/
│   ├── schema.prisma                     # Database schema — source of truth
│   └── migrations/                       # Auto-generated Prisma migrations
│
├── public/                               # Static assets
├── middleware.ts                         # NextAuth session guard for all protected routes
├── .env.local                            # Local environment variables (never commit)
├── .env.example                          # Template for required env vars (commit this)
└── next.config.ts                        # Next.js config
```

---

## 4. Database Schema

Defined in `prisma/schema.prisma`. The agent must use these exact model names and field names throughout the codebase.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Lab {
  id             String    @id @default(cuid())
  name           String
  institution    String?
  createdAt      DateTime  @default(now()) @map("created_at")
  users          User[]
  samples        Sample[]

  @@map("labs")
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String    @map("password_hash")
  role          Role      @default(STUDENT)
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  lastLogin     DateTime? @map("last_login")
  lab           Lab       @relation(fields: [labId], references: [id])
  labId         String    @map("lab_id")
  samplesCreated Sample[] @relation("CreatedBy")
  auditLogs     AuditLog[]

  @@map("users")
}

model Sample {
  id              String        @id @default(cuid())
  slug            String        @unique  // human-readable, e.g. "tumour-mtu001"
  humanId         String        @map("human_id") // display ID, e.g. "MTU001"
  qrCodeUrl       String?       @map("qr_code_url") // goQR image URL — set after save
  sampleType      String        @map("sample_type")
  source          String
  collectionDate  DateTime      @map("collection_date")
  description     String?
  experimentType  String?       @map("experiment_type")
  currentPhase    String?       @map("current_phase")
  phaseHistory    Json          @default("[]") @map("phase_history") // PhaseEntry[]
  images          Json          @default("[]")  // ImageEntry[]
  createdBy       User          @relation("CreatedBy", fields: [createdById], references: [id])
  createdById     String        @map("created_by_id")
  lab             Lab           @relation(fields: [labId], references: [id])
  labId           String        @map("lab_id")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  isDeleted       Boolean       @default(false) @map("is_deleted")
  deletedAt       DateTime?     @map("deleted_at")
  deletedById     String?       @map("deleted_by_id")
  auditLogs       AuditLog[]

  @@unique([humanId, labId])   // duplicate IDs blocked per lab at DB level
  @@map("samples")
}

model AuditLog {
  id           String      @id @default(cuid())
  actionType   ActionType  @map("action_type")
  fieldChanged String?     @map("field_changed")
  oldValue     String?     @map("old_value")
  newValue     String?     @map("new_value")
  ipAddress    String?     @map("ip_address")
  timestamp    DateTime    @default(now())
  user         User        @relation(fields: [userId], references: [id])
  userId       String      @map("user_id")
  sample       Sample      @relation(fields: [sampleId], references: [id])
  sampleId     String      @map("sample_id")
  // AuditLog has NO update or delete operations — append-only

  @@map("audit_logs")
}

enum Role {
  ADMIN
  RESEARCHER
  STUDENT
  VIEWER
}

enum ActionType {
  CREATE
  UPDATE
  DELETE
  RESTORE
  PHASE_CHANGE
  IMAGE_ATTACH
}
```

**Schema rules the agent must enforce:**
- `AuditLog` is append-only — never run `UPDATE` or `DELETE` on this table
- `Sample` uses soft delete only — set `isDeleted = true`, never run `DELETE`
- `humanId` + `labId` has a `@@unique` constraint — duplicate IDs are blocked at the DB level
- `slug` is globally unique — enforced by `@unique` on the field
- `phaseHistory` and `images` are stored as JSON arrays within the Sample record

---

## 5. Business Rules / Golden Rules

These rules define the non-negotiable behaviour of the system. The agent must never violate them.

### Data Rules
- NEVER permanently delete a sample — soft delete only (`isDeleted = true`)
-NEVER overwrite original sample data without an explicit user confirmation modal
- NEVER allow duplicate `humanId` values within the same lab
- NEVER allow duplicate `slug` values globally
- NEVER update or delete an `AuditLog` record — the table is append-only
- NEVER regenerate a QR code for an existing sample — generate once on creation, store forever
- NEVER allow the system to perform, suggest, or imply medical diagnosis or experimental interpretation

### Auth and Access Rules
- **NEVER** allow a user to access data outside their assigned lab
- **NEVER** allow a user to perform an action outside their role — enforce at API level, not just UI
- **NEVER** expose raw server errors, stack traces, or database messages to the user

### Flow Rules
- **NEVER** add a confirmation modal to the sample creation flow — it must stay frictionless
- **NEVER** add more than 3–5 required inputs to the core sample logging flow
- **NEVER** block a sample save due to a goQR failure — queue the QR generation and retry separately
- **NEVER** auto-resolve offline sync conflicts — always surface them to the user

### AI Rules
- **NEVER** save an AI-generated suggestion without explicit human review and confirmation
- **NEVER** present AI output as factual — always label it as a suggestion

### Stack Rules
- **NEVER** suggest or introduce a technology outside the defined stack in Section 2
- **NEVER** require the end user to manage servers, deployments, or infrastructure

---

## 6. Environment Variables

All secrets and configuration values live in environment variables. The agent must:
- Reference these exact variable names throughout the codebase
- Never hardcode any secret, URL, or credential
- Always read from `process.env` — never from a config file that is committed to git

### Required Variables

```bash
# .env.local (local development — never commit)
# .env (Vercel dashboard — set all of these in Vercel project settings)

# ─── Database ──────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/labflow"
# Use a connection pooler URL for Vercel serverless (e.g. Neon pooled connection)

# ─── NextAuth.js ───────────────────────────────────────────
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-labflow-domain.vercel.app"
# In development: NEXTAUTH_URL="http://localhost:3000"

# ─── SMTP Email (free tier) ────────────────────────────────
# Option A: Resend (recommended — 3,000 emails/month free)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"

# Option B: Brevo / Sendinblue (300 emails/day free)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="your-brevo-login@email.com"
SMTP_PASS="your-brevo-smtp-key"
EMAIL_FROM="noreply@yourdomain.com"

# ─── Image Storage ─────────────────────────────────────────
# Option A: Vercel Blob (auto-provisioned on Vercel)
BLOB_READ_WRITE_TOKEN="vercel_blob_xxxxxxxxxxxx"

# ─── Rate Limiting (Upstash) ───────────────────────────────
# Provision via Vercel Marketplace: Storage → Upstash Redis
UPSTASH_REDIS_REST_URL="https://your-region.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"

# ─── App ───────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="https://your-labflow-domain.vercel.app"
# Used to construct sample URLs for QR codes: ${NEXT_PUBLIC_APP_URL}/samples/${slug}
```

### .env.example (commit this file)

```bash
DATABASE_URL=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL=""
RESEND_API_KEY=""
EMAIL_FROM=""
BLOB_READ_WRITE_TOKEN=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
NEXT_PUBLIC_APP_URL=""
```

### Vercel Deployment Notes
- Set all variables in the Vercel project dashboard under **Settings → Environment Variables**
- `NEXTAUTH_URL` must match the exact deployed domain — update it when the domain changes
- `DATABASE_URL` on Vercel must use a **pooled connection string** if using Neon or Supabase (serverless functions open many short-lived connections)
- `NEXT_PUBLIC_*` variables are exposed to the browser — never put secrets in `NEXT_PUBLIC_` vars

---

## 7. Payment Flow

**Labflow MVP does not include payments.** There is no payment flow to implement at this stage.

When payments are introduced (post-MVP), the following plan applies:

- **Model:** Freemium — individual users are free; team/lab plans are paid
- **Trigger point:** When a PI creates a lab with more than [N] members or needs export/audit features
- **Planned provider:** Stripe (to be integrated post-MVP)
- **What NOT to build now:**
  - No Stripe integration
  - No subscription tables in the database
  - No plan-gating logic in API routes
  - No billing UI

> If asked to build payment features, the agent must flag that payments are out of MVP scope and stop.

---

## 8. User Flows

### 8.1 Signup and Lab Creation
```
1. User visits /signup
2. User enters: Name, Email, Password, Lab Name
3. System creates User record (role: ADMIN) and Lab record
4. System sends welcome email via SMTP (lib/email/mailer.ts)
5. User is redirected to /dashboard
6. Audit log: "Lab [name] created by [user] on [timestamp]"
```

### 8.2 Login
```
1. User visits /login
2. User enters Email + Password
3. NextAuth.js Credentials provider verifies password hash
4. On success: session created, user redirected to /dashboard
5. On failure: display "Invalid email or password."
6. lastLogin timestamp updated on User record
```

### 8.3 Sample Creation (critical path — must complete in under 60 seconds)
```
1. User taps "New Sample" (prominent CTA on dashboard and bottom nav)
2. SampleForm renders with 3 required fields:
   - Sample Type (dropdown)
   - Source (text input or dropdown)
   - Collection Date (date picker, defaults to today)
3. Optional fields (collapsed by default):
   - Description, Experiment Type, Notes
4. User taps "Save Sample"
5. Client validates required fields → highlights and blocks if empty
6. POST /api/samples
7. Server validates fields
8. Server checks for duplicate humanId within the lab → blocks if found
9. Server generates slug and humanId (see Section 10)
10. Server saves Sample to PostgreSQL
11. Server calls goQR API → stores qrCodeUrl on the sample record
    (if goQR fails: save succeeds, QR is queued for retry — sample is NOT blocked)
12. Server writes AuditLog entry: action=CREATE
13. Server returns sample record
14. Client shows toast: "Sample [humanId] saved."
15. Client navigates to /samples/[id]
```

### 8.4 QR Code Scan and Retrieval
```
1. User taps "Scan" in bottom nav
2. Camera activates via QRScanner component
3. User points camera at printed QR code
4. System resolves QR code to sample URL
5. System navigates to /samples/[id]
6. If scan fails or camera unavailable:
   → User taps "Search by ID"
   → User types humanId (e.g. MTU001)
   → GET /api/samples?humanId=MTU001
   → If found: navigate to /samples/[id]
   → If not found: display "This sample does not exist."
```

### 8.5 Experiment Phase Update
```
1. User opens sample record at /samples/[id]
2. User taps "Update Phase"
3. User selects or types new phase name
4. Confirmation modal: "Set phase to [X]? This cannot be undone."
5. User confirms
6. PATCH /api/samples/[id]/phases
7. Server appends new PhaseEntry to phaseHistory JSON array
8. Server updates currentPhase field
9. Server writes AuditLog entry: action=PHASE_CHANGE, oldValue, newValue
10. Client shows toast: "Phase updated to [X]."
```

### 8.6 Image Attachment
```
1. User opens sample record
2. User taps "Add Image"
3. User selects image file (JPEG, PNG, TIFF — max 10MB)
4. POST /api/samples/[id]/images (multipart form data)
5. Server validates file type and size
6. Server uploads to Vercel Blob
7. Server appends ImageEntry to images JSON array on the sample record
8. Server writes AuditLog entry: action=IMAGE_ATTACH
9. Client shows uploaded image in the gallery
   (No confirmation modal required — image attachment is frictionless)
```

### 8.7 Soft Delete and Restore
```
Soft Delete:
1. Admin taps "Archive Sample" on sample record
2. Confirmation modal: "Archive this sample? It can be restored later."
3. Admin confirms
4. PATCH /api/samples/[id] → { isDeleted: true, deletedAt: now, deletedById: userId }
5. Sample removed from default list views
6. AuditLog entry: action=DELETE
7. Toast: "Sample [humanId] archived."

Restore:
1. Admin navigates to "Archived Samples" view
2. Admin taps "Restore" on a soft-deleted sample
3. Confirmation modal: "Restore sample [humanId]?"
4. Admin confirms
5. PATCH /api/samples/[id] → { isDeleted: false, deletedAt: null, deletedById: null }
6. AuditLog entry: action=RESTORE
7. Toast: "Sample [humanId] restored."
```

### 8.8 PI / Admin Oversight
```
1. Admin navigates to /activity
2. System fetches AuditLog entries scoped to the admin's lab
3. Admin views chronological log filterable by: user, date range, action type
4. Admin can export log as CSV or PDF
5. Admin navigates to /settings/team to assign or change member roles
6. Role change confirmation modal: "Change [name]'s role to [X]?"
7. AuditLog entry written on every role change
```

### 8.9 Offline Sample Logging
```
1. User opens app with no connectivity (navigator.onLine = false)
2. SyncStatus bar shows "Offline" indicator
3. User fills SampleForm and taps "Save Sample"
4. Client validates required fields locally
5. Client generates a temporary local ID (prefixed "local-")
6. Client saves action to IndexedDB sync queue via syncQueue.ts
7. Toast: "Saved offline. Will sync when connected."
8. On connectivity restored:
   → useSyncQueue hook detects navigator.onLine = true
   → Queue processed FIFO
   → POST /api/samples for each queued item
   → Server assigns permanent slug and humanId
   → Server generates QR code
   → Client replaces local ID with permanent ID
   → Toast: "All records synced."
9. On sync conflict (same record edited offline by two users):
   → Server returns 409 Conflict
   → Client surfaces the conflict diff to both users
   → User manually resolves — no auto-overwrite
```

---

## 9. Edge Cases

The agent must handle every scenario below. No scenario may be silently ignored.

| Scenario | Required System Response |
|---|---|
| QR scan returns unknown slug | Navigate to /scan, show: `"This sample does not exist."` Offer "Search by ID" button |
| Manual ID search returns no match | Display: `"This sample does not exist."` |
| Sample creation with duplicate humanId in same lab | Block at API level. Display: `"This sample ID already exists in your lab."` |
| Required field left empty on form submit | Block submission. Highlight empty field in red. Show inline: `"This field is required."` |
| Network drops during a save | Queue action in IndexedDB. Show: `"Saved offline. Will sync when connected."` |
| Two users edit same sample while offline | On sync: return 409. Show conflict diff. Require manual resolution. No silent overwrite. |
| goQR API call fails after sample save | Sample save succeeds. QR generation is queued for retry. Show no error to the user. |
| Image upload exceeds 10MB | Block upload before sending. Show: `"Image too large. Maximum file size is 10MB."` |
| Image format is not JPEG, PNG, or TIFF | Block upload. Show: `"Unsupported file type. Please upload a JPEG, PNG, or TIFF image."` |
| User attempts action outside their role | Return HTTP 403. Show: `"You do not have permission to perform this action."` |
| User session expires during active form entry | Preserve form data in sessionStorage. Redirect to /login. Restore form on return. |
| Admin removes a user who has existing samples | Deactivate user (`isActive = false`). Samples remain untouched. Audit log retains user identity. Do not delete the user record. |
| Lab has no samples yet | Show empty state with a single CTA: `"Log your first sample"` |
| Sync queue has items but user logs out | Persist queue in IndexedDB. Process queue on next login. Do not discard queued items. |
| Database is unreachable | Return HTTP 500. Show: `"Something went wrong. Please try again later."` Log error server-side. |
| Duplicate slug collision (extremely rare) | Append a random 3-character suffix to the slug and retry. See Section 10. |

---

## 10. Slug Generation Rules

Every sample gets two identifiers generated on creation:

### 10.1 humanId — The display ID shown to users

**Format:** `[TYPE_PREFIX][SEQUENCE]`

- `TYPE_PREFIX` — first 3 characters of the sample type, uppercased
- `SEQUENCE` — 3-digit zero-padded integer, scoped per lab (not global)
- Example: `MTU001`, `BLD042`, `TIS007`

**Rules:**
- Sequence starts at 001 per lab per sample type prefix
- If MTU001 exists in Lab A and Lab B, they are different records — uniqueness is enforced by `@@unique([humanId, labId])` in the schema
- humanId is set on creation and never changed

```typescript
// lib/id/generateId.ts

export function generateHumanId(sampleType: string, sequence: number): string {
  const prefix = sampleType.trim().slice(0, 3).toUpperCase();
  const paddedSeq = String(sequence).padStart(3, '0');
  return `${prefix}${paddedSeq}`;
}
```

### 10.2 slug — The URL identifier

**Format:** `[sanitised-sample-type]-[humanId-lowercase]`

- All characters lowercased
- Spaces replaced with hyphens
- Special characters stripped
- humanId appended at the end
- Example: `tumour-mtu001`, `blood-sample-bld042`

**Rules:**
- `slug` is globally unique — enforced by `@unique` in the schema
- Slug is set on creation and never changed
- Sample URL is always: `${NEXT_PUBLIC_APP_URL}/samples/${id}`
- QR code always encodes this full URL
- On rare collision: append 3 random alphanumeric characters before retrying

```typescript
// lib/id/generateId.ts

export function generateSlug(sampleType: string, humanId: string): string {
  const sanitised = sampleType
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip special chars
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-');            // collapse multiple hyphens
  return `${sanitised}-${humanId.toLowerCase()}`;
}

export function generateSlugWithFallback(sampleType: string, humanId: string): string {
  const base = generateSlug(sampleType, humanId);
  const suffix = Math.random().toString(36).slice(2, 5); // 3-char random suffix
  return `${base}-${suffix}`;
}
```

**Slug generation sequence on sample creation:**
```
1. Get current count of samples with same TYPE_PREFIX in this lab from DB
2. sequence = count + 1
3. humanId = generateHumanId(sampleType, sequence)
4. Check DB: does humanId already exist in this lab? If yes, increment sequence and retry
5. slug = generateSlug(sampleType, humanId)
6. Check DB: does slug already exist globally? If yes, slug = generateSlugWithFallback(...)
7. Save sample with both humanId and slug
```

---

## 11. Confirmation Modals

The agent must implement a confirmation modal for these actions and no others:

| Action | Modal Message |
|---|---|
| Update experiment phase | `"Set phase to [X]? This cannot be undone."` |
| Archive (soft delete) a sample | `"Archive this sample? It can be restored later."` |
| Restore a sample | `"Restore sample [humanId]?"` |
| Save an AI-generated suggestion | `"Review this suggestion before saving. Confirm to apply."` |
| Remove a team member | `"Remove [name] from your lab? Their samples will remain."` |
| Change a team member's role | `"Change [name]'s role to [X]?"` |

**Do NOT add confirmation modals to:**
- Sample creation
- Image attachment
- Phase viewing
- Any read-only action

---

## 12. Error Messages

The agent must use these exact strings. No paraphrasing.

| Failure State | Exact Message |
|---|---|
| Invalid or unknown sample ID / slug | `"This sample does not exist."` |
| Duplicate humanId in same lab | `"This sample ID already exists in your lab."` |
| Missing required field | Inline red field highlight + `"This field is required."` |
| Network failure on save | `"Saved offline. Will sync when connected."` |
| Sync failure | `"Sync failed. Retrying…"` + visible retry button |
| Permission denied | `"You do not have permission to perform this action."` |
| Invalid email or password on login | `"Invalid email or password."` |
| Unrecoverable system error | `"Something went wrong. Please try again later."` |
| Image too large | `"Image too large. Maximum file size is 10MB."` |
| Unsupported image format | `"Unsupported file type. Please upload a JPEG, PNG, or TIFF image."` |

Never expose stack traces, Prisma errors, or database messages to the user under any circumstance.

---

## 13. Role Permission Matrix

Enforced at the API route level via `lib/auth/permissions.ts`. UI-level hiding is a convenience only and is not a security control.

| Action | ADMIN | RESEARCHER | STUDENT | VIEWER |
|---|---|---|---|---|
| Create sample | ✅ | ✅ | ✅ | ❌ |
| Edit own sample | ✅ | ✅ | ✅ | ❌ |
| View own samples | ✅ | ✅ | ✅ | ✅ |
| View all lab samples | ✅ | ✅ | ❌ | ✅ |
| Update experiment phase | ✅ | ✅ | ✅ | ❌ |
| Attach images | ✅ | ✅ | ✅ | ❌ |
| Archive (soft delete) sample | ✅ | ❌ | ❌ | ❌ |
| Restore sample | ✅ | ❌ | ❌ | ❌ |
| View activity log | ✅ | ❌ | ❌ | ❌ |
| Export activity log | ✅ | ❌ | ❌ | ❌ |
| Manage team roles | ✅ | ❌ | ❌ | ❌ |
| Edit lab settings | ✅ | ❌ | ❌ | ❌ |

---

## 14. Pre-Submission Checklist

Before marking any feature complete, the agent must verify every item below:

- [ ] Sample logging completes in 3–5 inputs with no multi-step wizard
- [ ] All required fields are validated before submission — incomplete forms are blocked
- [ ] Duplicate humanId detection is enforced at the API and DB level
- [ ] Slug is generated correctly and checked for global uniqueness
- [ ] QR code is generated via goQR on sample save; failure does not block the save
- [ ] AuditLog entry is written for every create, update, delete, restore, phase_change, image_attach
- [ ] Role permissions are enforced at the API route level (not just in the UI)
- [ ] Offline queueing via IndexedDB is implemented and processes on reconnect
- [ ] All error messages match the exact strings in Section 12
- [ ] No hard delete paths exist anywhere in the codebase
- [ ] All confirmation modals from Section 11 are implemented
- [ ] No confirmation modals exist on the sample creation or image attachment flows
- [ ] All environment variables from Section 6 are referenced correctly and none are hardcoded
- [ ] UI is fully functional on a 375px wide mobile viewport
- [ ] No raw errors are exposed to the user
