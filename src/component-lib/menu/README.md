# Menu

A menu of commands for React 19, following the WAI-ARIA menu button pattern. No
runtime dependencies besides React.

```ts
import {
  Menu, MenuItem, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem,
  MenuGroup, MenuSeparator, MenuSub,
} from "@/components/menu";
import "@/components/menu/styles.css";
```

```tsx
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

| Prop | Default | Description |
| --- | --- | --- |
| `trigger` | — | A single element, cloned with the ARIA wiring. |
| `open` / `defaultOpen` / `onOpenChange` | — | Controlled or uncontrolled. Reasons: `escape`, `outside`, `trigger`, `select`, `api`. |
| `label` | "Menu" | Names the menu for screen readers. |
| `side` / `align` / `gap` | `bottom` / `start` / `4` | Flips and clamps to stay on screen. |
| `closeOnSelect` | `true` | Whether choosing an item closes the menu. |
| `className`, `classNames`, `style`, `localeText` | — | Slots: `root`, `list`, `item`, `icon`, `label`, `shortcut`, `separator`, `group`, `groupLabel`, `indicator`, `submenu`. |

## Items

| Component | Notes |
| --- | --- |
| `MenuItem` | `onSelect`, `icon`, `shortcut`, `disabled`, `destructive`. Closes the menu by default. |
| `MenuCheckboxItem` | `checked` / `onCheckedChange`. Stays open by default, so several can be toggled. |
| `MenuRadioGroup` + `MenuRadioItem` | `value` / `onValueChange` on the group, `value` on each item. |
| `MenuGroup` | A titled section; the title is a label, never focused. |
| `MenuSeparator` | A rule between sections. |
| `MenuSub` | A nested menu, opened by hover, Enter or the arrow pointing into it. |

`shortcut` only draws the hint — binding the key is yours, because only the page
knows what else is listening.

## Keyboard

| Key | Does |
| --- | --- |
| `ArrowDown` / `ArrowUp` on the trigger | Opens, starting at the first or last item. |
| `ArrowDown` / `ArrowUp` | Moves through items, wrapping, skipping disabled ones. |
| `Home` / `End` | First / last item. |
| Letters | Typeahead. Repeating a letter cycles through items starting with it. |
| `Enter` / `Space` | Chooses the focused item. |
| `ArrowRight` / `ArrowLeft` | Opens a submenu / goes back to its parent (mirrored in RTL). |
| `Escape` | Closes and returns focus to the trigger. |
| `Tab` | Closes and carries on through the page. |

Disabled items stay focusable so that someone navigating by keyboard can find
out an action exists but is unavailable; arrow keys skip past them.

The navigation and typeahead rules are framework-free in `core/navigation.ts`
and unit-tested there. Placement comes from `shared/core/position.ts`.
