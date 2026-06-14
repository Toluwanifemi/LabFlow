---
trigger: always_on
---

# Rule: Design System

## Token Pipeline

The project stores design tokens across four files. Each has a distinct role — the agent must understand which to read and which to modify.

| File | Role | Agent action |
|---|---|---|
| `tokens/colour-tokens.json` | **Source of truth** for all color values | Edit to add/modify colors |
| `tokens/design-tokens.tokens.json` | **Source of truth** for typography (sizes, weights, families, line heights) | Edit to add/modify typography |
| `tokens/design-tokens.css` | **Generated output** — CSS custom properties built from the two JSON sources | Read-only for component styling. Never edit directly. |
| `tokens/convert-tokens.js` | **Build script** — reads the JSON files and writes `design-tokens.css` | Run after editing any JSON source to regenerate the CSS |

**Workflow to add a new token:**
1. Edit `colour-tokens.json` or `design-tokens.tokens.json`
2. Run `node tokens/convert-tokens.js`
3. Verify `tokens/design-tokens.css` now contains the new variable
4. Reference the new variable in component styles

The generated CSS file (`design-tokens.css`) is available globally — import it in the root layout to make all variables available to every component.

## Mandatory: Use CSS Variables, Never Raw Values

The agent must never write hardcoded color values or typography values anywhere in this codebase.

**Wrong:**
```css
color: #1a1a1a;
font-size: 16px;
font-family: 'Inter', sans-serif;
background: #f5f5f5;
```

**Correct:**
```css
color: var(--color-on-surface);
font-size: var(--typography-body-large-font-size);
font-family: var(--typography-body-large-font-family);
background: var(--color-surface);
```

Before writing any style value, check `tokens/design-tokens.css` first. If a variable exists for what you need, use it. If it does not exist, add it via the token pipeline above.

Available token categories in `tokens/design-tokens.css`:
- **Colors (light + dark):** `--color-primary`, `--color-on-primary`, `--color-primary-container`, `--color-on-primary-container`, `--color-secondary`, `--color-on-secondary`, `--color-secondary-container`, `--color-on-secondary-container`, `--color-tertiary`, `--color-on-tertiary`, `--color-tertiary-container`, `--color-on-tertiary-container`, `--color-error`, `--color-on-error`, `--color-error-container`, `--color-on-error-container`, `--color-background`, `--color-on-background`, `--color-surface`, `--color-on-surface`, `--color-surface-variant`, `--color-on-surface-variant`, `--color-outline`, `--color-outline-variant`, `--color-inverse-surface`, `--color-inverse-on-surface`, `--color-inverse-primary`, `--color-surface-dim`, `--color-surface-bright`, `--color-surface-container-lowest`, `--color-surface-container-low`, `--color-surface-container`, `--color-surface-container-high`, `--color-surface-container-highest`
- **Typography:** `--typography-{display|headline|title|body|label}-{large|medium|small}-{font-size|font-family|font-weight|line-height|letter-spacing|text-transform|text-decoration|font-style|font-stretch|paragraph-indent|paragraph-spacing}`
- **To find the right typography token use, see the Material Type Scale mapping in code-style.md §10.**

## Spacing Scale

Use multiples of 4px for all spacing (margin, padding, gap). Do not use arbitrary values.

Allowed: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`

> Note: These spacing values are not yet tokenized as CSS variables. If a large number of components need spacing tokens, add them to `tokens/design-tokens.tokens.json` via the pipeline above.

## Border Radius

Use these values only:

- Small elements (badges, tags, chips): `4px`
- Buttons and inputs: `8px`
- Cards, modals, dialogs, toasts: `12px`

> Note: These border-radius values are not yet tokenized as CSS variables. Add them to the token pipeline if they need to be referenced in JavaScript or if a design system update adds radius tokens.

## Styling Method

- All component styles use CSS Modules (`.module.css` files).
- No inline `style={{}}` props except for truly dynamic values that cannot be expressed in CSS (e.g., a progress bar width driven by a number, a transform rotation angle).
- No Tailwind. No styled-components. CSS Modules only.
- See `code-style.md §10` for complete styling conventions with examples.

## Mobile-First

Labflow users are primarily on mobile. Every component must be built mobile-first:

- Default styles target mobile (small screens).
- Use `@media (min-width: 768px)` to layer in desktop styles.
- Use `@media (min-width: 1024px)` for wide desktop overrides (rare — most layouts resolve at 768px).
- Touch targets must be a minimum of 44px × 44px (both height and width).

## Dark Mode

The design tokens include full dark theme support. `tokens/design-tokens.css` provides dark values via two mechanisms:

1. **Automatic system preference** — `@media (prefers-color-scheme: dark)` applies dark tokens automatically when the user's OS is in dark mode. No code change needed.
2. **Explicit toggle** — `[data-theme="dark"]` selector allows a manual theme switch. Set `document.documentElement.setAttribute('data-theme', 'dark')` to activate.

**To test a component in dark mode:**
- Open DevTools → toggle `[data-theme="dark"]` on the `<html>` element, or
- Set your OS to dark mode if the component has no explicit toggle.

**Do not** define separate color overrides per component — dark mode is handled entirely at the global token level.

## Cross-References

| Topic | File |
|---|---|
| Styling conventions (CSS Modules examples, Type Scale mapping) | `code-style.md §10` |
| Component structure rules (when to read this file) | `skills/component-builder/SKILL.md` |
| Primitives list (Button, Input, Modal, Badge, etc.) | `ARCHITECTURE.md §Empty State / Error / Loading Patterns` |
| Full token reference | `tokens/design-tokens.css` |
| Token source (color) | `tokens/colour-tokens.json` |
| Token source (typography) | `tokens/design-tokens.tokens.json` |
| Build script | `tokens/convert-tokens.js` |
