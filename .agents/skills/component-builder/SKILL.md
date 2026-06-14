# SKILL.md — Component Builder

Load this skill whenever you are creating or modifying a React component in LabFlow. It tells you where the component goes, how it should be structured, and how to wire it up to the design system without reinventing anything.

## Before You Start

Read `.agents/rules/design-system.md` first. Components that do not follow the design system get rejected at review. This skill assumes you already know the tokens from tokens/design-tokens.css, the spacing scale, and the component primitives.

Then ask: does this component already exist? Search `components/` before adding a new one. Two slightly different `Button` components is how codebases rot.

## When to Use This Skill

Use this skill whenever:
- Building a new UI component from scratch
- Modifying or extending an existing component
- Deciding whether to create a new component or reuse an existing one
- Building a page that composes multiple components together

---

## Step 1 — Classify the Component

Before writing any code, determine which category the component belongs to. This decides where it lives.

| Category | Folder | Description | Examples |
|---|---|---|---|
| UI Primitive | `components/ui/` | Single-purpose, stateless, reusable across the entire app | `Button`, `Input`, `Modal`, `Toast`, `Badge`, `EmptyState` |
| Feature Component | `components/[feature]/` | Domain-specific, may hold state, scoped to one feature area | `SampleForm`, `PhaseTracker`, `QRDisplay`, `ActivityLog` |
| Layout Component | `components/layout/` | Structural components that wrap pages or sections | `Navbar`, `BottomNav`, `SyncStatus` |
| Page Component | `app/(dashboard)/[route]/page.tsx` | Top-level route component — composes feature components | `NewSamplePage`, `SampleDetailPage` |

**Rule:** If you are unsure, make it a UI Primitive first. Promote it to a Feature Component only when it needs domain-specific logic.

---

## Step 2 — Define the Props Interface

Every component starts with a typed props interface. Define it directly above the component function.

### Pattern

```typescript
// Always define props interface before the component
interface ComponentNameProps {
  // Required props first
  requiredProp: string;
  // Optional props after
  optionalProp?: boolean;
  // Event handlers use standard React types
  onChange?: (value: string) => void;
  onClick?: () => void;
  // Children
  children?: React.ReactNode;
  // className for composability on primitives
  className?: string;
}

export function ComponentName({ requiredProp, optionalProp = false, className }: ComponentNameProps) {
  return ( ... );
}
```

### Rules
- All props must be typed — never use `any` or `object`
- Optional props must have a default value declared in destructuring
- Event handler types must match the event they handle: `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`, etc.
- UI Primitives must accept a `className` prop for composability
- Feature Components do not need to accept `className` — their layout is fixed

---

## Step 3 — Choose the Right Component Template

All styling uses **CSS Modules** — never Tailwind, never inline `style` props. Import the `.module.css` file alongside the component and use the imported `styles` object for all class names.

### 3.1 UI Primitive — Stateless

```css
/* components/ui/Button.module.css */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  border-radius: 8px;
  font-family: var(--typography-label-large-font-family);
  font-weight: var(--typography-label-large-font-weight);
  font-size: var(--typography-label-large-font-size);
  line-height: var(--typography-label-large-line-height);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Variants */
.primary {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}
.primary:active {
  opacity: 0.85;
}

.secondary {
  border: 1px solid var(--color-outline);
  background-color: transparent;
  color: var(--color-primary);
}
.secondary:active {
  background-color: var(--color-surface-variant);
}

.destructive {
  background-color: var(--color-error);
  color: var(--color-on-error);
}
.destructive:active {
  opacity: 0.85;
}

.ghost {
  background-color: transparent;
  color: var(--color-on-surface-variant);
}
.ghost:active {
  background-color: var(--color-surface-variant);
}

/* Sizes */
.sm {
  min-height: 44px;
  padding: 0 12px;
  font-size: var(--typography-body-small-font-size);
}

.md {
  min-height: 44px;
  padding: 0 16px;
}

.lg {
  min-height: 52px;
  padding: 0 24px;
  font-size: var(--typography-body-large-font-size);
}
```

```typescript
// components/ui/Button.tsx
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <button
      disabled={disabled || isLoading}
      className={classNames}
      {...props}
    >
      {isLoading ? (
        <span>
          Loading&hellip;
        </span>
      ) : children}
    </button>
  );
}
```

**CSS Module rules for UI Primitives:**
- Every style uses a `var(--token)` from `tokens/design-tokens.css` — never hardcoded values
- Variants are separate CSS classes composed in the `className` string
- Touch targets are minimum 44px × 44px (see `design-system.md` §Mobile-First)
- Border-radius uses the design system scale: `8px` for buttons and inputs
- Interactive states (hover, active, focus-visible, disabled) are covered
- `gap` uses the spacing scale: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, etc.

### 3.2 Feature Component — With Local State

```css
/* components/samples/PhaseTracker.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.currentPhase {
  color: var(--color-on-surface);
  font-family: var(--typography-title-medium-font-family);
  font-size: var(--typography-title-medium-font-size);
  font-weight: var(--typography-title-medium-font-weight);
}

.historyList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.historyItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: var(--color-surface-container-low);
}

.historyPhase {
  color: var(--color-on-surface);
  font-size: var(--typography-body-medium-font-size);
}

.historyMeta {
  color: var(--color-on-surface-variant);
  font-size: var(--typography-body-small-font-size);
}
```

```typescript
// components/samples/PhaseTracker.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import type { PhaseEntry } from '@/types';
import styles from './PhaseTracker.module.css';

interface PhaseTrackerProps {
  currentPhase: string | null;
  phaseHistory: PhaseEntry[];
  sampleId: string;
  canEdit: boolean;
}

export function PhaseTracker({ currentPhase, phaseHistory, sampleId, canEdit }: PhaseTrackerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPhase, setNewPhase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  async function handlePhaseUpdate() {
    if (!newPhase.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/samples/${sampleId}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: newPhase.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update phase');
      showToast({ message: `Phase updated to ${newPhase}.`, type: 'success' });
      setIsModalOpen(false);
      setNewPhase('');
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.currentPhase}>
          {currentPhase ?? 'No phase set'}
        </span>
        {canEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            Update Phase
          </Button>
        )}
      </div>

      {phaseHistory.length > 0 && (
        <div className={styles.historyList}>
          {phaseHistory.map((entry, i) => (
            <div key={i} className={styles.historyItem}>
              <span className={styles.historyPhase}>{entry.phase}</span>
              <span className={styles.historyMeta}>
                {new Date(entry.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <Modal
          title="Update Phase"
          onClose={() => setIsModalOpen(false)}
          onConfirm={handlePhaseUpdate}
          confirmLabel="Update"
          isLoading={isSubmitting}
        >
          <div>
            <label htmlFor="phase-input">
              Set phase to <strong>{newPhase || '...'}</strong>? This cannot be undone.
            </label>
            <input
              id="phase-input"
              type="text"
              value={newPhase}
              onChange={e => setNewPhase(e.target.value)}
              placeholder="Enter phase name"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
```

### 3.3 Server Component (no interactivity)

```typescript
// app/(dashboard)/samples/[id]/page.tsx
import { getSampleById } from '@/lib/db/samples';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SampleDetail } from '@/components/samples/SampleDetail';

export default async function SampleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const sample = await getSampleById(params.id, session.user.labId);
  if (!sample) return <p>This sample does not exist.</p>;

  return <SampleDetail sample={sample} userRole={session.user.role} />;
}
```

**Rule:** Pages are Server Components by default. Add `'use client'` only when the component needs `useState`, `useEffect`, event handlers, or browser APIs. Never add `'use client'` to a page that can be a Server Component.

---

## Step 4 — Build the SampleForm Component

The `SampleForm` is the most critical component in the product. It must be fast, simple, and reliable. Follow this exact structure:

```css
/* components/samples/SampleForm.module.css */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 80px;
}

.requiredSection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  color: var(--color-on-surface);
  font-family: var(--typography-label-large-font-family);
  font-size: var(--typography-label-large-font-size);
  font-weight: var(--typography-label-large-font-weight);
}

.required {
  color: var(--color-error);
  margin-left: 2px;
}

.select,
.input {
  width: 100%;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  font-family: var(--typography-body-large-font-family);
  font-size: var(--typography-body-large-font-size);
  outline: none;
}

.select:focus,
.input:focus {
  border-color: var(--color-primary);
  outline: 2px solid var(--color-primary-container);
}

.fieldError .select,
.fieldError .input {
  border-color: var(--color-error);
  background-color: var(--color-error-container);
}

.errorText {
  color: var(--color-error);
  font-size: var(--typography-body-small-font-size);
}

.optionalToggle {
  background: none;
  border: none;
  color: var(--color-primary);
  font-family: var(--typography-label-large-font-family);
  font-size: var(--typography-label-large-font-size);
  font-weight: var(--typography-label-large-font-weight);
  cursor: pointer;
  text-align: left;
  padding: 0;
}

.optionalSection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.submitButton {
  width: 100%;
}
```

```typescript
// components/samples/SampleForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import styles from './SampleForm.module.css';

interface SampleFormData {
  sampleType: string;
  source: string;
  collectionDate: string;
  description?: string;
  experimentType?: string;
}

interface SampleFormProps {
  onSuccess?: (id: string) => void;
}

const SAMPLE_TYPES = ['Tumour', 'Blood', 'Tissue', 'Urine', 'Saliva', 'CSF', 'Other'];

export function SampleForm({ onSuccess }: SampleFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { isOnline, queueAction } = useSyncQueue();

  const [form, setForm] = useState<SampleFormData>({
    sampleType: '',
    source: '',
    collectionDate: new Date().toISOString().split('T')[0], // today default
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SampleFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.sampleType) newErrors.sampleType = 'This field is required.';
    if (!form.source.trim()) newErrors.source = 'This field is required.';
    if (!form.collectionDate) newErrors.collectionDate = 'This field is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    if (!isOnline) {
      queueAction({ action: 'create_sample', payload: form });
      showToast({ message: 'Saved offline. Will sync when connected.', type: 'warning' });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast({ message: data.error ?? 'Something went wrong. Please try again later.', type: 'error' });
        return;
      }

      showToast({ message: `Sample ${data.humanId} saved.`, type: 'success' });
      router.push(`/samples/${data.id}`);
      onSuccess?.(data.id);
    } catch {
      showToast({ message: 'Something went wrong. Please try again later.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function setField<K extends keyof SampleFormData>(key: K, value: SampleFormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <div className={styles.form}>

      {/* Required fields — always visible */}
      <div className={styles.requiredSection}>

        {/* Sample Type */}
        <div className={`${styles.field} ${errors.sampleType ? styles.fieldError : ''}`}>
          <label className={styles.label} htmlFor="sample-type">
            Sample Type<span className={styles.required}>*</span>
          </label>
          <select
            id="sample-type"
            className={styles.select}
            value={form.sampleType}
            onChange={e => setField('sampleType', e.target.value)}
          >
            <option value="">Select sample type</option>
            {SAMPLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.sampleType && <p className={styles.errorText}>{errors.sampleType}</p>}
        </div>

        {/* Source */}
        <div className={`${styles.field} ${errors.source ? styles.fieldError : ''}`}>
          <label className={styles.label} htmlFor="source">
            Source<span className={styles.required}>*</span>
          </label>
          <input
            id="source"
            className={styles.input}
            type="text"
            value={form.source}
            onChange={e => setField('source', e.target.value)}
            placeholder="e.g. Patient 42, Site 3"
          />
          {errors.source && <p className={styles.errorText}>{errors.source}</p>}
        </div>

        {/* Collection Date */}
        <div className={`${styles.field} ${errors.collectionDate ? styles.fieldError : ''}`}>
          <label className={styles.label} htmlFor="collection-date">
            Collection Date<span className={styles.required}>*</span>
          </label>
          <input
            id="collection-date"
            className={styles.input}
            type="date"
            value={form.collectionDate}
            onChange={e => setField('collectionDate', e.target.value)}
          />
          {errors.collectionDate && <p className={styles.errorText}>{errors.collectionDate}</p>}
        </div>

      </div>

      {/* Optional fields — collapsed by default */}
      <button
        type="button"
        className={styles.optionalToggle}
        onClick={() => setShowOptional(s => !s)}
      >
        {showOptional ? '− Hide optional fields' : '+ Add description or experiment type'}
      </button>

      {showOptional && (
        <div className={styles.optionalSection}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">Description</label>
            <textarea
              id="description"
              className={styles.input}
              value={form.description ?? ''}
              onChange={e => setField('description', e.target.value)}
              placeholder="Optional notes about this sample"
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="experiment-type">Experiment Type</label>
            <input
              id="experiment-type"
              className={styles.input}
              type="text"
              value={form.experimentType ?? ''}
              onChange={e => setField('experimentType', e.target.value)}
              placeholder="e.g. PCR, Sequencing"
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        isLoading={isSubmitting}
        onClick={handleSubmit}
        className={styles.submitButton}
      >
        Save Sample
      </Button>

    </div>
  );
}
```

**SampleForm rules the agent must never violate:**
- Optional fields are collapsed by default — never show them all at once
- Collection Date defaults to today — user adjusts only if needed
- Submit button shows loading state immediately on tap
- Offline save must work without network — queue and confirm
- Validation runs on submit only — not on every keystroke

---

## Common Mistakes

- Creating a new primitive when an existing one would work with a new variant. Extend, do not duplicate.
- Forgetting `className` prop on a component that might need to be laid out differently in different places.
- Making a component a client component because it was easier, when a server component would have worked.
- Using CSS Modules without design tokens — always use `var(--color-*)` and `var(--typography-*)` from `tokens/design-tokens.css`.
- Using hardcoded spacing values — always use the 4px spacing scale (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- Using Tailwind utility classes or inline `style` props instead of CSS Modules.
- Adding complex logic inside the JSX. Extract to a named constant or helper above the return.
- Forgetting `'use client'` on components that use hooks or browser APIs.
- Importing `auth` from `@/lib/auth/config` — use `@/lib/auth` instead (see `security.md §2.2`).
- Using `cn()`, `clsx()`, or `tailwind-merge` — CSS Modules compose class names with string concatenation or array join.
