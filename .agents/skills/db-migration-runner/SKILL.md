# SKILL.md — DB Migration Runner

> Read this skill before touching `prisma/schema.prisma`, running any Prisma command, or making any change that affects the database structure.

---

---

##  Prisma Setup for Labflow

###  Required Files

```
prisma/
├── schema.prisma       ← source of truth for all DB structure
├── seed.ts             ← development seed data
└── migrations/         ← auto-generated migration history (never edit manually)
```

### Prisma Client Singleton

Always import the Prisma client from `lib/db/client.ts`. Never instantiate `PrismaClient` directly in a route or component.

```typescript
// lib/db/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Why the singleton pattern:** Next.js hot reloads in development create new module instances on every file change. Without the singleton, each reload creates a new `PrismaClient`, which rapidly exhausts the PostgreSQL connection pool.

###  Database URL for Vercel (Connection Pooling)

Vercel runs Next.js as serverless functions. Each function invocation opens a new DB connection. Without a connection pooler, this exhausts PostgreSQL's connection limit quickly.

```bash
# .env.local — for local development (direct connection)
DATABASE_URL="postgresql://user:password@host:5432/labflow"

# On Vercel — use the POOLED connection string from your provider
# Neon: use the pooled URL ending in ?pgbouncer=true&connection_limit=1
# Supabase: use the connection pooler URL (port 6543)
DATABASE_URL="postgresql://user:password@pooler-host:6543/labflow?pgbouncer=true&connection_limit=1"

# If your provider gives both a direct and pooled URL, you may also need:
DIRECT_URL="postgresql://user:password@direct-host:5432/labflow"
# Set directUrl in schema.prisma when using Neon or Supabase with migrations
```

**Configure `schema.prisma` for providers that need both:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // pooled — used at runtime
  directUrl = env("DIRECT_URL")         // direct — used for migrations only
}
```

---

## The Complete Labflow Schema

This is the authoritative schema. The agent must not add, remove, or rename any field without an explicit instruction and a corresponding migration.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── ENUMS ────────────────────────────────────────────────────────────────

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

// ─── MODELS ───────────────────────────────────────────────────────────────

model Lab {
  id          String    @id @default(cuid())
  name        String
  institution String?
  createdAt   DateTime  @default(now()) @map("created_at")
  users       User[]
  samples     Sample[]

  @@map("labs")
}

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         Role      @default(STUDENT)
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  lastLogin    DateTime? @map("last_login")

  lab    Lab    @relation(fields: [labId], references: [id])
  labId  String @map("lab_id")

  samplesCreated Sample[]   @relation("CreatedBy")
  auditLogs      AuditLog[]

  @@map("users")
}

model Sample {
  id             String    @id @default(cuid())
  slug           String    @unique               // URL identifier — never changes after creation
  humanId        String    @map("human_id")      // Display ID e.g. MTU001 — never changes after creation
  qrCodeUrl      String?   @map("qr_code_url")   // Set after goQR call — may be null briefly after creation
  sampleType     String    @map("sample_type")
  source         String
  collectionDate DateTime  @map("collection_date")
  description    String?
  experimentType String?   @map("experiment_type")
  currentPhase   String?   @map("current_phase")
  phaseHistory   Json      @default("[]") @map("phase_history")  // PhaseEntry[]
  images         Json      @default("[]")                         // ImageEntry[]
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  isDeleted      Boolean   @default(false) @map("is_deleted")
  deletedAt      DateTime? @map("deleted_at")
  deletedById    String?   @map("deleted_by_id")

  createdBy   User   @relation("CreatedBy", fields: [createdById], references: [id])
  createdById String @map("created_by_id")

  lab    Lab    @relation(fields: [labId], references: [id])
  labId  String @map("lab_id")

  auditLogs AuditLog[]

  @@unique([humanId, labId])  // duplicate humanIds blocked per lab at DB level
  @@map("samples")
}

model AuditLog {
  id           String     @id @default(cuid())
  actionType   ActionType @map("action_type")
  fieldChanged String?    @map("field_changed")
  oldValue     String?    @map("old_value")
  newValue     String?    @map("new_value")
  ipAddress    String?    @map("ip_address")
  timestamp    DateTime   @default(now())

  user   User   @relation(fields: [userId], references: [id])
  userId String @map("user_id")

  sample   Sample @relation(fields: [sampleId], references: [id])
  sampleId String @map("sample_id")

  // ⚠️ AuditLog is APPEND-ONLY
  // Never run UPDATE or DELETE on this table — not in migrations, not in queries
  @@map("audit_logs")
}
```

### Schema Rules Per Table

**Lab**
- `id` is a CUID — never use auto-increment integers
- `name` is required — validate before saving

**User**
- `passwordHash` is never returned in API responses — always use `select` to exclude it
- `isActive` is the soft-disable mechanism — never delete users
- `role` defaults to `STUDENT` — ADMIN is only assigned explicitly

**Sample**
- `slug` and `humanId` are set once on creation and never changed
- `qrCodeUrl` may be null immediately after creation (goQR is called async)
- `phaseHistory` and `images` are JSON arrays — see type definitions in `types/index.ts`
- `isDeleted` is the soft delete flag — never use `prisma.sample.delete()`
- The `@@unique([humanId, labId])` constraint enforces no duplicate humanIds per lab at the DB level

**AuditLog**
- This table is append-only — never write a Prisma `update` or `delete` targeting this table
- `timestamp` is set by the DB via `@default(now())` — never pass it from the client
- `ipAddress` is extracted from the request headers server-side — never from the client

**All Models**
- Every field uses `@map("snake_case_name")` to map camelCase Prisma fields to snake_case database columns
- Every model uses `@@map("snake_case_plural")` to map Prisma model names to snake_case table names
- Always add both annotations when creating a new field or model — see `AGENTS.md §4` for the full list

---

## Migration Workflow

###  Step-by-Step: Creating a New Migration

Follow these exact steps every time the schema changes.

**Step 1 — Edit the schema**
Make your changes in `prisma/schema.prisma` only. Never edit migration files directly.

**Step 2 — Generate and apply the migration (development)**
```bash
npx prisma migrate dev --name <descriptive-migration-name>
```

This command:
- Compares the current schema to the last migration state
- Generates a new SQL migration file in `prisma/migrations/`
- Applies the migration to your local development database
- Regenerates the Prisma client

**Step 3 — Review the generated SQL**
Always open and read the generated `.sql` file before committing. Verify it does exactly what you intended — no accidental column drops, no unintended type changes.

**Step 4 — Commit both files**
```bash
git add prisma/schema.prisma
git add prisma/migrations/
git commit -m "db: <same name as migration>"
```

**Step 5 — Apply to production (Vercel)**
On Vercel, migrations are applied via:
```bash
npx prisma migrate deploy
```
Add this to your Vercel build command or a post-deploy script:
```
"build": "prisma generate && prisma migrate deploy && next build"
```

### Development vs Production Commands

| Command | When to use |
|---|---|
| `prisma migrate dev` | Local development only — creates migration files and applies them |
| `prisma migrate deploy` | Production and CI/CD — applies existing migrations, never creates new ones |
| `prisma migrate reset` | Local development only — resets the DB and reapplies all migrations. NEVER on production. |
| `prisma db push` | Schema prototyping only — applies schema without creating a migration file. NEVER use for real changes. |
| `prisma generate` | After any schema change — regenerates the Prisma client. Must run before building. |
| `prisma studio` | Local development only — opens a GUI to inspect the database |

**Rules:**
- Never run `prisma migrate dev` in a production or Vercel environment
- Never run `prisma migrate reset` anywhere except a local development database
- Never use `prisma db push` for real schema changes — it leaves no migration trail
- Always run `prisma generate` after editing `schema.prisma`

---

## Migration Naming Conventions

Migration names must be lowercase, hyphenated, and descriptive. They go directly in the `--name` flag.

| Type of change | Naming pattern | Example |
|---|---|---|
| Create a new table | `create-[model]` | `create-lab`, `create-sample`, `create-audit-log` |
| Add a field | `add-[field]-to-[model]` | `add-qr-code-url-to-sample` |
| Remove a field | `remove-[field]-from-[model]` | `remove-experiment-type-from-sample` |
| Rename a field | `rename-[old]-to-[new]-on-[model]` | `rename-slug-to-url-key-on-sample` |
| Add an index | `add-index-[field]-on-[model]` | `add-index-lab-id-on-sample` |
| Add a unique constraint | `add-unique-[field]-on-[model]` | `add-unique-human-id-lab-id-on-sample` |
| Change a field type | `change-[field]-type-on-[model]` | `change-collection-date-type-on-sample` |
| Add an enum value | `add-[value]-to-[enum]` | `add-technician-to-role-enum` |
| Initial schema | `init` | `init` |

---

##  Adding Fields Safely

###  Adding a Nullable Field (safe — no data risk)

```prisma
// Before
model Sample {
  id         String @id @default(cuid())
  sampleType String
}

// After — adding an optional field
model Sample {
  id             String  @id @default(cuid())
  sampleType     String
  externalRefId  String?   // ← new nullable field — safe to add
}
```

```bash
npx prisma migrate dev --name add-external-ref-id-to-sample
```

No data is at risk — existing rows get `NULL` for the new column.

###  Adding a Required Field (requires a default or a data backfill)

Never add a non-nullable field without a default value to a table that already has rows. This will cause the migration to fail.

```prisma
// ❌ This will fail if the sample table has rows
model Sample {
  newRequiredField String  // no default — Postgres cannot fill existing rows
}

// ✅ Correct — provide a default
model Sample {
  newRequiredField String @default("pending")
}

// ✅ Or — make it nullable first, backfill data, then make it required
model Sample {
  newRequiredField String?  // step 1: add nullable
}
// After migration + backfill, change to:
model Sample {
  newRequiredField String   // step 2: make required
}
```

### Renaming a Field (requires caution)

Prisma treats a rename as a drop + add. This destroys data in the renamed column.

```bash
# Safe rename approach:
# 1. Add the new field as nullable
# 2. Write a data migration to copy values from old → new
# 3. Make the new field required
# 4. Remove the old field
# Do NOT just rename the field in schema.prisma and run migrate dev
```

### Removing a Field (permanent data loss — requires explicit confirmation)

The agent must never remove a field from the schema without explicit instruction from the developer. Removing a column drops all data in that column permanently.

---

## The Initial Migration (First Run)

When setting up a new environment for the first time:

```bash
# 1. Ensure DATABASE_URL is set in .env.local
# 2. Run the initial migration
npx prisma migrate dev --name init

# 3. Verify all tables were created
npx prisma studio
# or
npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

Expected tables after `init`:
- `Lab`
- `User`
- `Sample`
- `AuditLog`
- `_prisma_migrations` (internal Prisma tracking table — do not touch)

---

##  Seed Data (Development Only)

Seed data is only for local development — never run seeds in production.

```typescript
// prisma/seed.ts

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a seed lab
  const lab = await prisma.lab.upsert({
    where: { id: 'seed-lab-001' },
    update: {},
    create: {
      id:          'seed-lab-001',
      name:        'Seed Research Lab',
      institution: 'University of Lagos',
    },
  });

  // Create a seed admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@labflow.dev' },
    update: {},
    create: {
      name:         'Seed Admin',
      email:        'admin@labflow.dev',
      passwordHash: await bcrypt.hash('labflow123', 12),
      role:         Role.ADMIN,
      labId:        lab.id,
    },
  });

  // Create a seed researcher
  const researcher = await prisma.user.upsert({
    where: { email: 'researcher@labflow.dev' },
    update: {},
    create: {
      name:         'Seed Researcher',
      email:        'researcher@labflow.dev',
      passwordHash: await bcrypt.hash('labflow123', 12),
      role:         Role.RESEARCHER,
      labId:        lab.id,
    },
  });

  // Create two seed samples
  await prisma.sample.upsert({
    where: { slug: 'tumour-mtu001' },
    update: {},
    create: {
      slug:           'tumour-mtu001',
      humanId:        'MTU001',
      sampleType:     'Tumour',
      source:         'Mice',
      collectionDate: new Date('2024-01-15'),
      description:    'Seed tumour sample for development',
      currentPhase:   'Collection',
      phaseHistory:   [{ phase: 'Collection', updatedBy: admin.id, timestamp: new Date().toISOString() }],
      images:         [],
      createdById:    admin.id,
      labId:          lab.id,
    },
  });

  await prisma.sample.upsert({
    where: { slug: 'blood-bld001' },
    update: {},
    create: {
      slug:           'blood-bld001',
      humanId:        'BLD001',
      sampleType:     'Blood',
      source:         'Human',
      collectionDate: new Date('2024-01-16'),
      currentPhase:   'Processing',
      phaseHistory:   [
        { phase: 'Collection', updatedBy: researcher.id, timestamp: new Date('2024-01-16').toISOString() },
        { phase: 'Processing', updatedBy: researcher.id, timestamp: new Date('2024-01-17').toISOString() },
      ],
      images:      [],
      createdById: researcher.id,
      labId:       lab.id,
    },
  });

  console.log('Seed complete.');
  console.log('Admin login:      admin@labflow.dev     / labflow123');
  console.log('Researcher login: researcher@labflow.dev / labflow123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

**Register the seed script in `package.json`:**
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

**Run the seed:**
```bash
npx prisma db seed
```

---

## Verifying a Migration Ran Correctly

After every migration, verify these checks before moving on:

```bash
# 1. Check migration status — all migrations should show "applied"
npx prisma migrate status

# 2. Verify schema matches the database
npx prisma db execute --stdin <<< "\d samples"
# Should list all columns including the newly added ones

# 3. Run a quick Prisma client check
node -e "const { prisma } = require('./lib/db/client'); prisma.sample.count().then(console.log)"
```

**In production (Vercel), verify via:**
```bash
npx prisma migrate status --schema=prisma/schema.prisma
```

---

## What To Do When a Migration Fails

### Failure in Development

```bash
# 1. Check what went wrong
npx prisma migrate status

# 2. If the migration is in a "failed" state, resolve the issue in schema.prisma
# then run:
npx prisma migrate dev --name <same-name>

# 3. If the database is in an unrecoverable local state:
npx prisma migrate reset   # WARNING: destroys all local data and reruns all migrations
npx prisma db seed         # Reseed development data
```

### Failure in Production

Never run `prisma migrate reset` in production. Instead:

```bash
# 1. Check which migration failed
npx prisma migrate status

# 2. Connect to the DB directly and inspect the error
# (Use your provider's console — Neon, Supabase, Railway all have SQL editors)

# 3. Fix the root cause (usually a constraint violation or type mismatch)

# 4. If the migration partially applied, manually roll back the partial change
#    using raw SQL in your provider's console, then redeploy

# 5. Re-run deploy
npx prisma migrate deploy
```

---

## Labflow-Specific Migration Rules

These rules apply to every schema change in this project:

- **NEVER** add an `UPDATE` or `DELETE` operation targeting `AuditLog` in any migration
- **NEVER** drop the `@@unique([humanId, labId])` constraint on `Sample` — it enforces business rule integrity
- **NEVER** drop the `@unique` constraint on `Sample.slug`
- **NEVER** change `passwordHash` to a non-hashed field or make it accessible via a `select *`
- **NEVER** add cascade deletes to `AuditLog` — log entries must survive even if samples or users are deleted
- **NEVER** remove the `isDeleted`, `deletedAt`, or `deletedById` fields from `Sample` — these are the soft delete mechanism
- **ALWAYS** use `cuid()` for new ID fields — never `autoincrement()` or `uuid()`
- **ALWAYS** add new optional fields as `String?` (nullable) first — make required only after data is confirmed clean
- **ALWAYS** name migrations descriptively — see Section 5
- **ALWAYS** annotate new fields with `@map("snake_case_name")` and new models with `@@map("snake_case_plural")` — see `AGENTS.md §4`

---

## Migration Checklist

Before committing any schema change, verify:

- [ ] `prisma/schema.prisma` was the only file edited — no manual changes to migration SQL files
- [ ] `npx prisma migrate dev --name <descriptive-name>` was run and succeeded
- [ ] The generated SQL file was reviewed — no unexpected column drops or type changes
- [ ] `npx prisma migrate status` shows all migrations as "applied"
- [ ] `npx prisma generate` was run and the client is up to date
- [ ] Seed data in `prisma/seed.ts` is updated if the new schema requires it
- [ ] `AuditLog` table has no `UPDATE` or `DELETE` cascade rules added
- [ ] All new required fields have a `@default` value or are nullable
- [ ] The `@@unique([humanId, labId])` constraint on `Sample` is intact
- [ ] The `@unique` constraint on `Sample.slug` is intact
- [ ] Both `prisma/schema.prisma` and `prisma/migrations/` are committed together
- [ ] All new fields have `@map("snake_case_name")` annotation matching the AGENTS.md convention
- [ ] All new models have `@@map("snake_case_name")` annotation

---

## Cross-References

| Topic | File |
|---|---|
| Authoritative schema definition (field names, `@map`/`@@map` values) | `AGENTS.md §4` |
| Audit Log append-only rules, `ipAddress` extraction | `security.md §9` |
| Prisma query patterns, client singleton usage | `code-style.md §6` |
| Database schema overview, connection pooling notes | `ARCHITECTURE.md §8` |
| Prisma client singleton reference | `lib/db/client.ts` |