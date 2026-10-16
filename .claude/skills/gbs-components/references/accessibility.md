# Accessibility contract

Each component supplies its own roles, states and keyboard behaviour. A short
list of things stays yours — mostly names and headings, which only the page
knows. Do not duplicate what is already supplied: a second `aria-describedby`
or your own `<label htmlFor>` will fight the built-in wiring.

## What the components supply

| Area | Supplied |
| --- | --- |
| **Form fields** | A real native control; `<label>` linked to it via a generated `useId`; `aria-describedby` assembled from the hint, description and error (`{id}-description`, `{id}-error`); `aria-invalid` when `error` is set; `aria-required`. |
| **CheckboxGroup / RadioGroup** | `role="group"` / `role="radiogroup"` with the `label` as the legend, one shared `name`, one tab stop, arrow-key roving. |
| **Switch** | `role="switch"` on a real checkbox, so it is announced "on"/"off"; Space toggles, → on and ← off (mirrored in RTL). |
| **NumberInput** | `role="spinbutton"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`. |
| **Select / MultiSelect** | `role="combobox"` owning a `role="listbox"`; `aria-expanded`, `aria-controls`, `aria-activedescendant` so focus stays in the search box; `aria-selected` per option. |
| **Modal** | Native `<dialog>`: top layer, the page behind inert, focus trap, focus return on close. `title` names it. |
| **Popover** | `aria-expanded` and `aria-controls` on the trigger; `title` names the panel; light dismiss and Escape from the browser; focus returns to the trigger. |
| **Menu** | The WAI-ARIA menu button pattern: `aria-haspopup`, `aria-expanded`, `role="menu"` / `menuitem`, arrow keys, typeahead, Home/End, submenu arrows, Escape. |
| **Tooltip** | `aria-describedby` on the child; Escape dismisses from anywhere. |
| **Toaster** | A labelled landmark, polite live region; error toasts use `role="alert"`; **Alt+T** moves focus to the stack. |
| **Alert** | `role="alert"` for `danger` / `warning`, `role="status"` otherwise. |
| **Progress** | `role="progressbar"` with `aria-valuenow` / `min` / `max`, omitted entirely when `value={null}` so it reads as busy. |
| **Tabs** | `role="tablist"` / `tab` / `tabpanel`, `aria-controls`, arrow keys (mirrored in RTL), Home/End, disabled tabs skipped. |
| **Accordion** | Native `<details>`/`<summary>`: focusable header, Enter and Space, panel out of the accessibility tree while closed. |
| **DataGrid** | The WAI-ARIA grid pattern: `role="row"` / `rowgroup`, `aria-colindex`, `aria-rowindex`, `aria-sort` on headers, `aria-multiselectable`, full cell keyboard navigation. |
| **Skeleton** | Bars are `aria-hidden` — a screen reader gains nothing from a grey box. |
| **Icons** | Decorative icons inside components are `aria-hidden`. |

## What you must still provide

1. **A `label` on every field.** It is the accessible name. Without it the
   control is unnamed, whatever the placeholder says.

2. **`aria-label` on icon-only buttons.**

   ```tsx
   <Button variant="ghost" icon={<TrashIcon />} aria-label="Delete" />
   ```

   A Tooltip does **not** supply this: it is wired with `aria-describedby`, so
   the control keeps its own name. An icon button inside a Tooltip still needs
   `aria-label`.

3. **A name for every overlay.** `Modal` needs `title`, or `aria-label` when it
   has no visible heading. `Popover` needs `title` or `aria-label` (it defaults
   to "More information", which says nothing). `Menu` needs `label` (defaults to
   "Menu").

4. **`aria-label` on `TabList`** — `<TabList aria-label="Project">` — and on
   `DataGrid` where the grid's purpose is not obvious from the page.

5. **Your own heading levels.** `CardHeader` takes a `title` node, not a level:
   pass `<h3>Revenue</h3>` so the page owns the document outline.

6. **A name for a set of avatars.** `<AvatarGroup label="Assigned to">` — a row
   of faces with no name says nothing.

7. **`alt` semantics for Avatar** come from `name`. Set `decorative` when the
   person's name is already printed next to it, so it is not announced twice.

8. **An accessible route to anything that only appears on hover.** Tooltips are
   never shown on touch devices and never take focus.

9. **Keyboard bindings for `shortcut` hints.** `MenuItem shortcut="⌘E"` only
   draws the hint; binding the key is yours.

10. **A visible label for `Stat`** — it takes `label` as a required prop for
    that reason; a figure alone means nothing.

## Errors and validation

Pass the message as `error`. The component sets `aria-invalid`, renders the
message with an `{id}-error` id and appends that id to `aria-describedby`.
Do not add `aria-invalid` or `aria-describedby` yourself.

Order matters and is handled for you: any `aria-describedby` you pass is kept
first, then the hint, then the description, then the error — the error last
because it is the part that changes and the part a listener is waiting for.

## Live regions

- `Alert` announces only when its contents change. An alert rendered on first
  paint says nothing — use a toast for something that just happened.
- `Toaster` is always in the page as a polite region, so new toasts are read
  without interrupting; `type: "error"` interrupts.
- `Spinner` and `Skeleton` both take a `label`. Use one of them, or mark the
  region busy — not both, or the wait is announced twice.

## Right-to-left

Stylesheets use logical properties (`padding-inline`, `margin-inline`,
`inset-inline`, `border-inline`, `text-align: start`), so layout follows the
document's `dir` with no configuration. Arrow-key behaviour mirrors in Menu,
Switch, Tabs and the DataGrid. `Toaster` accepts an explicit `dir` prop
(`ltr` `rtl` `auto`) for a region that must differ from the page.

## Reduced motion

Most stylesheets (21 of 27) disable their animations under
`@media (prefers-reduced-motion: reduce)`. Do not add motion of your own that
ignores it.
