---
name: gbs-components
description: Builds UI with the GramproKit component library (@grampro/kit). Use when adding or changing UI in apps that have a component-lib/ folder.
autoAttach: ["src/**/*.tsx", "src/**/*.jsx", "app/**/*.tsx", "components/**/*.tsx"]
---

# GBS components (2.0 beta)

## Install before you import

Not an npm dependency — the CLI **copies source into the repo**:

```bash
npx @grampro/kit add Button,Input,Modal
```

Writes `component-lib/<folder>/` plus `component-lib/shared/`. Always pass
`--beta`. Import the barrel in your component:

```ts
import { Button } from "component-lib/button";
```

Styles are **one line** in the global CSS (Vite: `src/index.css`), never in a
component file. The CLI generates `component-lib/gbs.css` listing every
stylesheet you installed, and rewrites it on each install:

```css
@import "./component-lib/gbs.css";
```

With **Tailwind v4 only**, import it after the framework and into Tailwind's
components layer, or utilities stop overriding component rules:

```css
@import "tailwindcss";
@import "./component-lib/gbs.css" layer(components);
```

The installer prints whichever line applies. Component CSS is unlayered, so
Tailwind v3, Bootstrap and no-framework projects need nothing extra.

Folder = lowercased name, except `data-grid`, `date-picker`, `file-uploader`,
`number-input`, `radio-group`.

## Rules most often missed

1. **Change handlers are named per component.** `onValueChange`: Input,
   OtpInput, Textarea, NumberInput, CheckboxGroup, RadioGroup, Tabs, Accordion,
   MenuRadioGroup. `onCheckedChange`: Checkbox, Switch, MenuCheckboxItem.
   `onChange`: Select, MultiSelect, DatePicker, DateRangePicker, FileUploader.
   `onOpenChange`: Modal, Popover, Menu.
2. **Never hand-roll `<label>`, hint or error markup.** Fields take `label`,
   `description` and `error`; `error` also marks the control invalid and wires
   `aria-describedby`. A `<label>` wrapper breaks it.
3. **Style via `classNames` slots** (`classNames={{ root, label }}`);
   `className` hits the root only. Theme globally with `--gbs-*` on `:root`.
4. **Mount `<Toaster />` and `<DialogHost />` once at the app root**, or
   `toast()` and `dialog.confirm()` do nothing.
5. **All are client components** (`"use client"`); a Next.js Server Component
   can render them but not pass function props.
6. **Compound families throw outside their parent**: Tab/TabList/TabPanel need
   Tabs, AccordionItem needs Accordion, MenuItem needs Menu.

## Inventory (required props in parens)

**Forms** — Input, Textarea, NumberInput (locale-aware), OtpInput; Checkbox +
CheckboxGroup; Radio (`value`) + RadioGroup; Switch (applies immediately);
Select and MultiSelect (`options`; searchable, client or server); DatePicker and
DateRangePicker; FileUploader (chunked).

**Actions** — Button: variants, sizes, icons, auto-loading from a returned
promise; `render` draws a router link.

**Overlays** — Modal (native `<dialog>`, also drawers); `dialog` + DialogHost
(`await dialog.confirm/alert/prompt`); Popover (`trigger`); Menu (`trigger`) with
MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem, MenuGroup,
MenuSeparator, MenuSub; Tooltip (`content`); `toast` + Toaster.

**Data** — DataGrid (`data`, `columns`) + createColumnHelper: virtualized;
sort, filter, edit, CSV/Excel/PDF export. Optional agent surface: `ai` renders a
natural-language box, and `registerGridTool` exposes the grid to a browser agent
over WebMCP (see "Agent surface").

**Display** — Tabs/TabList/Tab (`value`)/TabPanel (`value`); Accordion +
AccordionItem (`value`); Card/CardHeader/CardBody/CardFooter/Stat; Alert; Badge
and Tag; Avatar and AvatarGroup; Progress and CircularProgress (`value={null}`
is indeterminate); Skeleton and Empty; Spinner; Breadcrumb (`items`,
`renderLink`).

## Example

```tsx
"use client";
import { useState } from "react";
import { Button } from "component-lib/button";
import { Input } from "component-lib/input";
import { Select } from "component-lib/combobox";
import { Modal } from "component-lib/modal";
import { toast } from "component-lib/toaster";

const ROLES = [{ value: "admin", label: "Admin" }, { value: "dev", label: "Dev" }];

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const invalid = !!email && !email.includes("@");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Invite</Button>
      <Modal open={open} onOpenChange={setOpen} title="Invite a teammate"
        footer={({ close }) => (
          <Button disabled={!email || invalid} onClick={async () => {
            await invite({ email, role });
            toast.success("Invitation sent");
            close();
          }}>Send</Button>
        )}>
        <Input label="Email" type="email" value={email} onValueChange={setEmail}
          required error={invalid ? "Enter a valid email" : undefined} />
        <Select label="Role" options={ROLES} value={role} onChange={setRole} />
      </Modal>
    </>
  );
}
```

## Agent surface (DataGrid, optional)

Entirely opt-in. Without it, nothing changes and nothing is downloaded.

**A person typing.** `ai` renders a box above the grid. It needs a provider
supplying an adapter; with no provider it renders nothing at all.

```tsx
import { GramproAIProvider } from "component-lib/shared";
import { DataGrid } from "component-lib/data-grid";

<GramproAIProvider adapter={myAdapter}>
  <DataGrid data={rows} columns={cols} ai semantics={SEMANTICS} />
</GramproAIProvider>
```

`adapter` is one function — `(utterance, contract, responseSchema) => envelope`.
No model is bundled, downloaded or named; the app brings its own, and the key
belongs on the app's server, never in client JavaScript.

**A browser agent.** `registerGridTool(agent)` registers one WebMCP tool,
`operate_grid`, whose schema is generated from the live grid. Requires no model
at all.

**Both go through the same validator**, which refuses an unknown column, an
operator the type lacks, a policy-denied column, or an irreversible operation
with no confirmation — and returns the reason. A producer proposes; it never
acts. Do not add repair, retries or a second execution path.

**Data leaves the page with a remote adapter.** The contract carries real
values from low-cardinality columns, so the model can map "Kerala" to `region`.
Mark personal columns `semantics: { email: { pii: true } }` — a PII column is
denied *and* never summarised — or pass `stats: false` to summarise nothing.
`policy.denyFilter` does **not** stop a column being described.

**`semantics` is where most quality comes from**: per column, give `synonyms`,
`description`, `unit`, `higherIsBetter`, `pii`. Reach for it before reaching for
a bigger model.

## Don't

- Raw `<button>`, `<input>`, `<select>`, `<table>`, `<dialog>`, or a hand-built
  modal/menu/tooltip, when a component exists.
- Deep imports (`.../input/react/Input`); import the barrel. Only `<name>/core`
  is also public.
- Editing `component-lib/shared/`; the CLI replaces it on update.
- Invented props: no `asChild`, no `variant` on Input, no `onChange` on Switch.
- `!important` or internal class selectors; set `--gbs-*` or pass `classNames`.
- A Tooltip as a name; icon buttons need `aria-label`.

## Details (in `references/`)

- `install.md` — CLI flags, folders, 1.x vs beta.
- `forms.md` — fields, controlled state, form posting.
- `pickers.md` — Select, MultiSelect, DatePicker, Uploader.
- `overlays.md` — Modal, dialog, Popover, Menu, Tooltip.
- `toaster.md` — `toast()` and `<Toaster />`.
- `data-grid.md` — columns, API, export.
- `data-display.md` — Card, Tabs, Accordion, Badge, Avatar.
- `styling.md` — tokens, layers, slots, `data-*`, dark.
- `accessibility.md` — what is supplied, what you add.
