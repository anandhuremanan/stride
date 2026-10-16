# Installing and updating GBS components

## The distribution model

`@grampro/kit` is **not a runtime dependency**. It is a CLI that copies
TypeScript source into the consuming repo, the way shadcn/ui does. Nothing is
imported from `node_modules` at runtime, and the copied files are yours to edit.

`package.json` of the library declares no `main` and no `exports` — only
`bin: { "@grampro/kit": "index.cjs" }` and `files: ["index.cjs", "source",
".gbs"]`. There is nothing to `import "@grampro/kit"` from.

Peer dependencies: `react@^19` and `react-dom@^19`. The beta components have no
other runtime dependencies.

## Commands

```bash
npx @grampro/kit add Button                 # one component
npx @grampro/kit add Button,Input,Modal     # several
npx @grampro/kit -i --beta                        # interactive picker
npx @grampro/kit -l --beta                        # list available
npx @grampro/kit add Button --force         # overwrite edited shared/ files
npx @grampro/kit skill                           # install this skill
npx @grampro/kit skill --for claude              # only the Claude Code copy
```

| Flag | Alias | Meaning |
| --- | --- | --- |
| `--add` | `-a` | Component, or comma-separated list. Case-insensitive. |
| `--interactive` | `-i` | Pick from a menu. |
| `--list` | `-l` | Print available components. |
| `--beta` | — | Install the 2.0 redesigned components. `-beta` also works. |
| `--skill` | — | Install this skill at the project root. `-skill` and `-a skill` also work. |
| `--for` | — | With `--skill`: which agents to write adapters for (`claude`, `codex`, `antigravity`, or `none`). Default: all. |
| `--force` | — | Replace files you have edited locally in `shared/` or `.gbs/`. |

**Always pass `--beta`.** Without it you get the 1.x set (`Select`, `SideBar`,
`FormRenderer`, `MaterialInput`, `ContextMenu`, `Navbar`, `Bargraph`,
`DarkMode`, `Toast`, `Uploader`, `UsePaginatedData`, `UseUploader` and others),
which is a different, older API with different props. The two sets are not
interchangeable.

## Installing this skill

```bash
npx @grampro/kit@latest -skill
```

Writes to the project root — not into `component-lib/`. Each agent reads a
different location, so the CLI writes one copy per agent from the same source:

| Path | For |
| --- | --- |
| `.gbs/skills/gbs-components/` | GBS SE Agent. Canonical; always written. |
| `.claude/skills/gbs-components/` | Claude Code. Full copy; `autoAttach` becomes `paths`. |
| `.agents/rules/gbs-components.md` | Antigravity. One file; set its glob in the IDE. |
| `AGENTS.md` | Codex. A pointer inside `@grampro/kit` markers. |

`--for claude,codex` narrows it; `--for none` writes only `.gbs/`. Switching
targets removes the adapters you dropped.

Re-running updates everything. A file edited since the CLI wrote it is never
replaced without `--force`, tracked by sha256 in `.gbs/.install-manifest.json`.
`AGENTS.md` is the exception: the project owns that file, so only the marked
block is rewritten.

It can be combined with a component install:

```bash
npx @grampro/kit add DataGrid -skill
```

## Where files land

Always `<cwd>/component-lib/`. The destination is not configurable, so run the
CLI from the repo root (or move the folder afterwards and fix the imports).

```
component-lib/
  shared/          installed with every beta component
  button/
  data-grid/
  input/
```

## Folder names

The folder is the lowercased component name, with five exceptions:

| Component | Folder |
| --- | --- |
| `DataGrid` | `data-grid` |
| `DatePicker` | `date-picker` |
| `FileUploader` | `file-uploader` |
| `NumberInput` | `number-input` |
| `RadioGroup` | `radio-group` |

Everything else: `Button` → `button`, `Combobox` → `combobox`, `Toaster` →
`toaster`, and so on.

Note the mismatch between the install name and the import name for two of them:

- Install `Combobox`; import `Select` and `MultiSelect` from `component-lib/combobox`.
- Install `Toaster`; import `toast` and `Toaster` from `component-lib/toaster`.
- Install `Dialog`; import `dialog` and `DialogHost` from `component-lib/dialog`.

## Available beta components

`DataGrid`, `Combobox`, `DatePicker`, `Toaster`, `FileUploader`, `Dialog`,
`Input`, `Modal`, `Textarea`, `Button`, `Breadcrumb`, `Checkbox`, `Tabs`,
`Spinner`, `Menu`, `Tooltip`, `Popover`, `Card`, `Skeleton`, `NumberInput`,
`RadioGroup`, `Switch`, `Accordion`, `Alert`, `Avatar`, `Badge`, `Progress`.

`Skeleton` also brings `Empty`; `Card` also brings `Stat`; `Badge` also brings
`Tag`; `Avatar` also brings `AvatarGroup`; `Input` also brings `OtpInput`;
`Progress` also brings `CircularProgress`.

## What each folder contains

```
component-lib/input/
  index.ts        the barrel — import from here
  core/           framework-free logic, no React import
  react/          the components
  styles.css      import once
  README.md       full prop documentation
```

Tests are deliberately **not** copied: they import `vitest`, which the consuming
project has no reason to have.

## The shared folder

Every beta component imports `../../shared`. The CLI installs it alongside
whatever you picked, and it is versioned independently (`shared/version.json`).

Rules the installer enforces:

- `shared/` only moves forward. If the project has a newer version than the CLI
  carries, the install aborts rather than downgrading it.
- A file you edited since the CLI wrote it is never replaced without `--force`.
  It tracks this with sha256 hashes in `component-lib/shared/.install-manifest.json`.

**Do not edit `component-lib/shared/`.** Components are yours to change; shared
is replaced on update. Put your changes in your own module instead.

`shared` exports `cx`, `countCharacters`, `describeField`,
`useControllableState`, `AnchoredPopover`, `placePopover`, `icons` and
`sharedVersion`.

## Importing

Import the barrel in the component that uses it:

```ts
import { Input, OtpInput } from "component-lib/input";
```

Put the styles in the project's global CSS, once — never in a component file.
The CLI writes `component-lib/gbs.css` importing every stylesheet you installed
and rewrites it on each install, so this one line stays correct as you add
components:

```css
@import "./component-lib/gbs.css";
```

With **Tailwind v4 only**, import it after the framework and into Tailwind's
components layer. Tailwind v4 puts its own utilities in a cascade layer, and an
unlayered component rule would outrank them:

```css
@import "tailwindcss";
@import "./component-lib/gbs.css" layer(components);
```

Both the order and the `layer()` matter. Imported before the framework, the
layer registers first and Tailwind's preflight lands after it, stripping the
component rules. Imported without `layer()`, `className` stops overriding them.
Tailwind v3, Bootstrap and projects with no framework need neither — the
installer prints whichever line applies to yours.

Individual stylesheets remain importable (`component-lib/input/styles.css`) if
you would rather curate the list yourself.

Most repos set a path alias. The library's own READMEs are written with
`@/components/<folder>`; the DataGrid README uses `component-lib/data-grid`.
Both mean the installed folder — follow whatever the host repo already uses.

### Public entry points

| Path | Contents |
| --- | --- |
| `component-lib/<folder>` | Components, hooks, types, locale defaults. **Use this.** |
| `component-lib/<folder>/core` | Framework-free helpers; safe on a server. Documented per component. |
| `component-lib/gbs.css` | Generated barrel of every installed stylesheet. **Import this.** |
| `component-lib/<folder>/styles.css` | One component's stylesheet, if you curate the list yourself. |
| `component-lib/shared` | Shared helpers, mostly used by the components themselves. |

Anything deeper (`component-lib/input/react/Input`) is internal. It will resolve,
but it is not a supported path and re-running the CLI may move it.

## Next.js

Every React file in the library starts with `"use client"`. A Server Component
can render them, but cannot pass function props (`onValueChange`, `onClick`,
`footer={({ close }) => …}`). Put the interactive part in a Client Component.

`toast()` does nothing during a server render. Call it in the browser, for
example after a Server Action resolves.
