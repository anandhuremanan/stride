# Shared

The small amount of code every component needs. It is not a component and is
not chosen from the installer's list: `shared/` is copied into `component-lib/`
with any install, and each component reaches it at exactly `../../shared/…`.

```ts
import { cx } from "../../shared/core/cx";
import { describeField } from "../../shared/core/field";
import { AnchoredPopover } from "../../shared/react/Popover";
```

| Export | Where | What it is |
| --- | --- | --- |
| `cx(...names)` | `core/cx` | Joins class names, dropping anything falsy. |
| `countCharacters(value)` | `core/text` | Grapheme-accurate length for character counters. |
| `describeField(id, parts)` | `core/field` | The `aria-describedby` for a control, from its hint, description and error. |
| `useControllableState(value, default)` | `react/useControllableState` | One value that may be controlled or owned by the component. |
| `AnchoredPopover` | `react/Popover` | Anchored popover on the native Popover API: top layer, light dismiss, flipping. |
| `Svg` and the shared glyphs | `react/icons` | The icon base, plus every glyph more than one component draws. |

`core/` is framework-free and `react/` is `"use client"`, the same split every
component uses.

## The rules

**Only `shared/` is shared.** A component never imports another component: each
is copied into a project on its own, so a sibling it reached for might not be
there. `__tests__/boundaries.test.ts` enforces this, along with the ban on
third-party imports.

**`shared/` never imports a component.** It has to stand on its own, and a
back-edge would make the folder uninstallable without the component it points
at.

**Changes here are additive.** Installing a component overwrites `shared/` with
the version that component was built against, and the other components already
in the project keep running against it. So add exports, add optional parameters,
and leave existing signatures alone; if something genuinely has to change shape,
ship it under a new name. `version.ts` and `version.json` are bumped together on
every change, and the installer compares them to refuse a downgrade.

**Nothing component-specific.** A hook only one component uses belongs in that
component, where it can change freely. This folder is for what is provably
duplicated: a shape drawn by two components, a rule two controls must agree on.

## What deliberately stays out

`useCombobox`, `useDatePicker` and the grid's state live with their components:
they are the component, not a primitive. The grid also keeps its own controlled
state, because it is one object of nine independent slices rather than a single
value, and `useControllableState` would obscure more than it saved. A component
inside a `CheckboxGroup` defers to the group instead, and only falls back to
`useControllableState` when it stands alone.
