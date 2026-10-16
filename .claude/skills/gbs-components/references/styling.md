# Styling

These components are styled. They ship a default look, and you replace it at
three levels: CSS variables, slot classes, and state attributes. Nothing is
`!important` and nothing needs overriding by specificity.

## 1. Stylesheets are per component

Each folder has its own `styles.css`. Put the ones you use in the project's
**global** stylesheet — `src/index.css` in Vite, the root layout's CSS in Next —
once each:

```css
@import "../component-lib/button/styles.css";
```

**Never import a stylesheet from a component file.** `import
"component-lib/button/styles.css"` inside a `.tsx` does bundle, but it makes CSS
order depend on module import order — which decides whether Tailwind utilities
still beat the component's own rules — and a lazy-loaded component then pulls its
styles in late, flashing unstyled. One global import per component, nowhere else.

Nothing renders correctly without it — the components emit class names only.

## 2. Theme with `--gbs-*` on `:root`

One set of variables themes every component at once. This is the whole theming
API; reach for the other levels only when it is not enough.

```css
:root {
  --gbs-accent: #7c3aed;
  --gbs-accent-soft: #f3e8ff;
  --gbs-radius: 10px;
  --gbs-font-size: 14px;
}
```

Set them on `:root`, not inside a component — components read them through
inheritance, so anything set on an ancestor reaches every control beneath it.

### Resolution order

Each component variable falls through this chain, stopping at the first set:

1. **The component's own variable** — `--in-accent`, `--dg-accent`, `--ck-border`.
   Set this to change one component, or one instance.
2. **The shared variable** — `--gbs-accent`. The one you normally set.
3. **The DataGrid's variable** — `--dg-accent`, when the grid's stylesheet is
   loaded. Kept for projects that themed the grid before the shared variables existed.
4. **The built-in default** — a `light-dark()` pair, so it follows the page's
   colour scheme.

```css
.in-root { --in-accent: var(--gbs-accent, var(--dg-accent, light-dark(#2563eb, #60a5fa))); }
```

### The shared variables

Defaults written light / dark.

**Surfaces and text:** `--gbs-bg` (`#ffffff`/`#0b0b0e`), `--gbs-fg`
(`#18181b`/`#f4f4f5`), `--gbs-muted` (`#71717a`/`#a1a1aa`), `--gbs-subtle`
(`#f4f4f5`/`#1c1c20`), `--gbs-hover` (`#f4f4f5`/`#1f1f23`), `--gbs-input-bg`
(`#ffffff`/`#121216`), `--gbs-readonly-bg` (`#fafafa`/`#0e0e12`),
`--gbs-header-bg` (`#fafafa`/`#111114`), `--gbs-header-fg` (`#3f3f46`/`#d4d4d8`).

**Borders and shape:** `--gbs-border` (`#e4e4e7`/`#27272a`),
`--gbs-border-subtle` (`#f0f0f2`/`#1c1c20`), `--gbs-border-control`
(`#a1a1aa`/`#52525b`), `--gbs-radius` (`8px`), `--gbs-font-size` (`13px`),
`--gbs-shadow`, `--gbs-backdrop`.

**Accent and status:** `--gbs-accent`, `--gbs-accent-soft`,
`--gbs-accent-strong`, `--gbs-accent-fg`, `--gbs-focus`, `--gbs-danger`,
`--gbs-danger-fg`, `--gbs-success`, `--gbs-warning`, `--gbs-info`.

**Grid-specific:** `--gbs-row-alt`, `--gbs-row-hover`, `--gbs-row-selected`,
`--gbs-row-selected-hover`, `--gbs-cell-px`, `--gbs-pin-shadow`,
`--gbs-skeleton`, `--gbs-tab-fg`, `--gbs-tooltip-bg`, `--gbs-tooltip-fg`.

### Per-component prefixes

To change one component only, set its own prefix on its root class:

| Component | Prefix | Root class |
| --- | --- | --- |
| DataGrid | `--dg-*` | `.dg-root` |
| Combobox | `--cb-*` | `.cb-root` |
| Toaster | `--ts-*` | `.ts-region` |
| Input | `--in-*` | `.in-root` |
| Button | `--bt-*` | `.bt-root` |

```css
.cb-root { --cb-accent: #7c3aed; --cb-radius: 12px; }
```

Toasts render on `<body>`, so grid/shared values they inherit must be set on
`:root`.

## 3. Slot classes

`className` goes to the root element only. To reach an inner part, use
`classNames`, a map of slot name to class string:

```tsx
<Input label="Email" classNames={{ root: "mb-4", label: "font-semibold", input: "font-mono" }} />
```

Slots are per component and listed in each `react/props.ts` and in this skill's
`forms.md` / `overlays.md` / `data-display.md`. Passing a slot that does not
exist is silently ignored, so check the list.

Classes are joined with `cx` from `shared/core/cx.ts`, which drops falsy values
— a conditional that evaluates to `undefined` contributes nothing.

## 4. Cascade layers and Tailwind

Every `styles.css` ships **unlayered** — no `@layer` wrapper anywhere:

```css
.bt-root { /* the component's rules */ }
```

That is deliberate. An unlayered rule beats every layered rule regardless of
specificity, so a layered library loses to any unlayered reset: Tailwind v3's
preflight and Bootstrap's Reboot both strip borders, padding and radii off
layered component rules. Unlayered, a class selector beats `*` on ordinary
specificity and both work with no setup.

The app imports the generated barrel once:

```css
@import "./component-lib/gbs.css";
```

With **Tailwind v4** — and only v4, which layers its own utilities — import it
after the framework and into Tailwind's components layer, so utilities still
win:

```css
@import "tailwindcss";
@import "./component-lib/gbs.css" layer(components);
```

Both the order and the `layer()` matter. Imported before the framework, the
`components` layer registers first and Tailwind's preflight lands after it,
which strips the component rules. Imported without `layer()`, the unlayered
rules outrank the utilities and `className` stops overriding them.

Tailwind **v3** needs neither: it emits utilities unlayered, after our CSS, so
source order already decides. A project with no CSS framework needs neither.

```tsx
<Button className="w-full sm:w-auto" classNames={{ content: "gap-3" }}>Save</Button>
```

Do not use `!important`, and do not write selectors against internal class names
(`.bt-root`, `.dg-cell`) in app CSS — they are implementation detail. Use the
variables or the slots.

## 4b. Scrollbars

Every scrolling surface in the kit is thin by default, using the standard
`scrollbar-width` / `scrollbar-color` properties (Baseline since December 2024)
rather than `::-webkit-scrollbar`. Four tokens control all of them:

```css
:root {
  --gbs-scrollbar-width: thin;        /* auto | thin | none */
  --gbs-scrollbar-thumb: ...;         /* derived from --gbs-accent */
  --gbs-scrollbar-thumb-hover: ...;
  --gbs-scrollbar-track: transparent;
}
```

Set them on `:root` to restyle every scrollbar, or on one element for one.
`scrollbar-width` takes no length — only `auto | thin | none`.

For your own scrolling areas, add `class="gbs-scroll"` to match. The kit never
touches scrollbars it was not asked to: an unrelated scroll container keeps the
browser default.

## 5. Unlayered resets (Bootstrap, Normalize)

Any stylesheet that ships **unlayered** beats every layered rule regardless of
specificity — the cascade settles layers before specificity. So Bootstrap's
Reboot (`button { border-radius: 0 }`, `button, input, textarea { font-size:
inherit }`) overrides our classes, and import order does not help.

Fix it in the project's global CSS by giving the reset its own layer, named
before `gbs`:

```css
@layer bootstrap, gbs, app, utilities;
@import url("bootstrap/dist/css/bootstrap.min.css") layer(bootstrap);
```

Only components whose root is a native form element are affected (Button,
Textarea). Class names never collide — ours are two-letter prefixed.

## 6. State attributes

Components expose their state as `data-*` attributes, so you can style states
without tracking them in React.

| Attribute | Where |
| --- | --- |
| `data-state="open"` / `"closing"` | Combobox, Popover, Menu, Modal, toasts |
| `data-side` | Popover, Menu, Tooltip — the side it settled on after flipping |
| `data-size` | Controls that take a `size` |
| `data-invalid`, `data-disabled` | Form controls |
| `data-active`, `data-selected` | Combobox options, grid cells and rows |
| `data-editing`, `data-pinned`, `data-density` | DataGrid |
| `data-type`, `data-custom`, `data-swiping` | Toasts |
| `data-position` | Toaster region |
| `aria-sort` | DataGrid header cells |

```css
.cb-option[data-active] { outline: 2px solid var(--gbs-focus); }
```

## 7. Dark mode

Colours are `light-dark()` pairs driven by the page's `color-scheme`, so the
default is whatever the device prefers. To pin it, set `color-scheme` — the
components follow:

```css
:root { color-scheme: light dark; }          /* follow the device */
:root[data-theme="dark"] { color-scheme: dark; }
:root[data-theme="light"] { color-scheme: light; }
```

The DataGrid additionally treats a `.dark` or `[data-theme="dark"]` ancestor as
forcing a scheme.

Do not maintain a second palette for dark mode. Override the `--gbs-*` variables
with `light-dark()` pairs, or set them inside your own `[data-theme="dark"]`
block, and every component follows.

## 8. Right-to-left

The components use logical properties and read `dir` from the document, so RTL
works without configuration. Arrow keys in Menu, Switch and Tabs mirror
automatically. The Toaster takes an explicit `dir` prop if one region needs to
differ from the page.
