# Overlays

Modal, Dialog, Popover, Menu, Tooltip and Toaster. All render in the browser's
top layer (native `<dialog>` or the Popover API) or a portal on `<body>`, so no
parent's `overflow`, `transform` or `z-index` can clip them. You never need a
portal, a z-index or a focus trap of your own.

## Choosing one

| | Interrupts | Lives | Use for |
| --- | --- | --- | --- |
| **Modal** | Yes, blocks | Top layer | A task or form that owns the screen |
| **dialog.confirm** | Yes, blocks | Top layer | A decision that must happen now |
| **Popover** | No | Top layer | A panel of controls tied to a trigger |
| **Menu** | No | Top layer | A list of commands |
| **Tooltip** | No | Top layer | A few words of label on hover/focus |
| **toast** | No, and leaves | A corner | Confirming what already happened |
| **Alert** | No, and stays | In the layout | The state a page or section is in |

## Modal

Built on native `<dialog>`: the browser supplies the top layer, the inert page
behind, the focus trap and focus return. The component adds controlled state,
dismiss rules, a close guard, sizes, drawers and animation.

```tsx
import { Modal } from "component-lib/modal";

const [open, setOpen] = useState(false);

<Modal open={open} onOpenChange={setOpen} title="Edit profile"
  footer={({ close }) => <Button onClick={close}>Done</Button>}>
  …
</Modal>
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` / `defaultOpen` / `onOpenChange` | `boolean` / `boolean` / `(open, reason?) => void` | — / `false` | Controlled or uncontrolled. `reason` is `escape`, `backdrop`, `close-button` or `api`. |
| `title`, `description` | `ReactNode` | — | Header text. |
| `aria-label` | `string` | — | Names a modal that has no `title`. |
| `children`, `footer` | `ReactNode \| ({ close }) => ReactNode` | — | Body and footer. |
| `size` | `sm` `md` `lg` `xl` `full` | `md` | 400 / 520 / 720 / 960 px, or the whole screen. |
| `placement` | `center` `top` `left` `right` `bottom` | `center` | `left`, `right` and `bottom` are drawers. |
| `closeButton`, `closeOnEscape`, `closeOnBackdrop` | `boolean` | `true` | Dismiss options. |
| `onBeforeClose` | `(reason) => boolean \| Promise<boolean>` | — | Return `false` to stay open. |
| `initialFocus` | `RefObject<HTMLElement>` | — | Otherwise `[data-autofocus]`, then the first focusable element. |
| `keepMounted` | `boolean` | `false` | Keep the content's state while closed. |
| `className`, `classNames`, `style`, `localeText`, `id`, `ref` | — | — | Slots below. |

Slots: `root`, `header`, `title`, `description`, `close`, `body`, `footer`.
`ref` exposes `open()`, `close()`, `getElement()`.

Guard an unsaved form:

```tsx
<Modal open={open} onOpenChange={setOpen}
  onBeforeClose={async (reason) =>
    reason === "api" || !dirty || dialog.confirm({ title: "Discard changes?" })}>
```

Known limits: exit animations need `transition-behavior: allow-discrete`
(Chrome 117+, Safari 18+); elsewhere it closes instantly. Scroll lock uses
`:root:has(.md-root[open])`, which can shift content by the scrollbar's width.

## dialog (alert / confirm / prompt)

A promise-based API for the decisions a Modal is too heavy for. Mount the host
**once** near the root; then call `dialog.*` from anywhere, including outside
React.

```tsx
// once, e.g. app/layout.tsx or App.tsx
import { DialogHost } from "component-lib/dialog";
<DialogHost />

// anywhere
import { dialog } from "component-lib/dialog";

if (await dialog.confirm({ title: "Delete 3 invoices?", intent: "danger", confirmLabel: "Delete" })) {
  await deleteInvoices();
}
const name = await dialog.prompt({ title: "Rename", defaultValue: "report.pdf", required: true });
await dialog.alert("Export finished");
```

- `alert` resolves when closed, `confirm` resolves `true`/`false`, `prompt`
  resolves the text or `null`.
- `onConfirm` may be async: the dialog shows progress, and if it throws, shows
  the error and stays open.
- Requests queue and show one at a time.
- Where there is no document (a server render) they resolve as canceled.

Options: `title`, `description`, `intent` (`default` `info` `success` `warning`
`danger`), `icon`, `confirmLabel`, `cancelLabel`, `dismissible`, `size`
(`sm` `md`), `onConfirm`. Prompt adds `defaultValue`, `placeholder`,
`inputLabel`, `inputType`, `required`, `validate`.

`<Dialog open onClose>` is the same dialog as an ordinary controlled component,
if you would rather not use the queue. `createDialogStore()` and
`createDialogApi(store)` build isolated instances; pass the store to
`<DialogHost store={store} />`.

## Popover

```tsx
<Popover trigger={<Button variant="outline">Filters</Button>} title="Filters">
  {({ close }) => (
    <>
      <Checkbox label="Only active" />
      <Button size="sm" onClick={close}>Apply</Button>
    </>
  )}
</Popover>
```

| Prop | Default | Description |
| --- | --- | --- |
| `trigger` | required | A **single** element, cloned with a ref and the ARIA wiring. |
| `open` / `defaultOpen` / `onOpenChange` | — | Reason: `escape`, `outside`, `trigger`, `api`. |
| `title` / `description` | — | Heading inside the panel; `title` also names it. |
| `aria-label` | "More information" | Names the panel when there is no `title`. |
| `side` / `align` | `bottom` / `start` | Flips and clamps to stay on screen. |
| `gap` | `6` | Distance from the trigger, in pixels. |
| `scrollable` | `false` | Cap the height to the space available and scroll. |
| `autoFocus` | `true` | Move focus into the panel on open. |
| `className`, `classNames`, `style`, `localeText` | — | Slots: `root`, `panel`, `header`, `title`, `description`, `body`. |

`children` may be a function receiving `{ close }`. The browser provides light
dismiss and Escape; focus returns to the trigger. `data-side` on the root says
which side it settled on after flipping.

## Menu

The WAI-ARIA menu button pattern. Use it for commands, not for a form control —
for picking a value use `Select`.

```tsx
import {
  Menu, MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem,
  MenuGroup, MenuSeparator, MenuSub,
} from "component-lib/menu";

<Menu trigger={<Button variant="outline">Actions</Button>} label="Row actions">
  <MenuItem icon={<EditIcon />} shortcut="⌘E" onSelect={edit}>Edit</MenuItem>
  <MenuSub label="Export">
    <MenuItem onSelect={() => download("csv")}>CSV</MenuItem>
    <MenuItem onSelect={() => download("pdf")}>PDF</MenuItem>
  </MenuSub>
  <MenuSeparator />
  <MenuCheckboxItem checked={compact} onCheckedChange={setCompact}>Compact rows</MenuCheckboxItem>
  <MenuSeparator />
  <MenuItem destructive onSelect={remove}>Delete</MenuItem>
</Menu>
```

**Menu:** `trigger` (required, a single element), `open`/`defaultOpen`/
`onOpenChange` (reasons `escape`, `outside`, `trigger`, `select`, `api`),
`label` ("Menu"), `side`/`align`/`gap` (`bottom`/`start`/`4`), `closeOnSelect`
(true), `className`, `classNames`, `style`, `localeText`.

Slots: `root`, `list`, `item`, `icon`, `label`, `shortcut`, `separator`,
`group`, `groupLabel`, `indicator`, `submenu`.

| Item | Props |
| --- | --- |
| `MenuItem` | `onSelect`, `icon`, `shortcut`, `disabled`, `destructive`. Closes the menu by default. |
| `MenuCheckboxItem` | `checked` / `onCheckedChange`. Stays open, so several can be toggled. |
| `MenuRadioGroup` + `MenuRadioItem` | `value` / `onValueChange` on the group, `value` on each item. |
| `MenuGroup` | A titled section; the title is a label, never focused. |
| `MenuSeparator` | A rule between sections. |
| `MenuSub` | A nested menu; opens on hover, Enter, or the arrow pointing into it. |

`shortcut` only draws the hint — binding the key is yours.

Keyboard: ↓/↑ on the trigger open at the first/last item; ↓/↑ move and wrap;
Home/End jump; letters typeahead; Enter/Space choose; →/← open a submenu or go
back (mirrored in RTL); Escape closes and returns focus; Tab closes and moves on.
Disabled items stay focusable but arrow keys skip them.

## Tooltip

```tsx
<Tooltip content="Export as CSV">
  <Button variant="ghost" aria-label="Export"><DownloadIcon /></Button>
</Tooltip>
```

| Prop | Default | Description |
| --- | --- | --- |
| `content` | required | The label. A few words; longer content belongs in a Popover. |
| `children` | required | A **single** element, cloned with a ref, handlers and `aria-describedby`. |
| `side` / `align` / `gap` | `top` / `center` / `6` | Flips and clamps. |
| `delay` | `400` | Wait before showing on hover. Keyboard focus never waits. |
| `closeDelay` | `120` | Wait before hiding. |
| `disabled` | `false` | Never show it. |
| `className`, `classNames`, `style` | — | Slots: `root`, `content`. |

**It describes, it does not name.** The tooltip is wired with
`aria-describedby`, so an icon button still needs its own `aria-label`. It never
takes focus, is `pointer-events: none`, and touch devices never see it — so
nothing essential may live only there.

## Toaster

See `toaster.md`.
