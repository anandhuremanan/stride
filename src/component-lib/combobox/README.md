# Combobox: Select and MultiSelect

Two value pickers with option search, built on one engine and styled to match
the DataGrid. No runtime dependencies besides React 19.

- **`<Select>`** — one value.
- **`<MultiSelect>`** — many values, shown as tags.

Both support client or server options, grouping, descriptions, disabled
options, virtualization for long lists, creating new options, forms, full
keyboard control, dark mode and right-to-left layouts.

## Setup

```ts
import { MultiSelect, Select } from "@/components/combobox";
import "@/components/combobox/styles.css";
```

The stylesheet reads the shared `--gbs-*` variables when you set them on
`:root`, so every component in the library shares one theme, and falls back to
the same default palette otherwise.

## Basic usage

```tsx
const countries = [
  { value: "in", label: "India", group: "Asia" },
  { value: "de", label: "Germany", group: "Europe", description: "Berlin" },
  { value: "mx", label: "Mexico", group: "Americas", disabled: true },
];

const [country, setCountry] = useState<string | null>(null);

<Select label="Country" options={countries} value={country} onChange={setCountry} />;

const [tags, setTags] = useState<string[]>([]);
<MultiSelect label="Tags" options={tagOptions} value={tags} onChange={setTags} max={5} />;
```

Both are controlled with `value` + `onChange`, or uncontrolled with
`defaultValue`. `onChange` also receives the full option objects:
`onChange={(value, option) => …}` (single) and `(values, options) => …` (multi).

## Options

```ts
interface ComboboxOption<V = string> {
  value: V;              // string or number
  label: string;
  description?: string;  // second line
  group?: string;        // heading; groups appear in first-seen order
  disabled?: boolean;
  icon?: ReactNode;
  keywords?: string[];   // extra search terms
}
```

Search matches the label (and highlights it), the description and keywords.

## Props

Shared by both components:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `ComboboxOption<V>[]` | required | Options to show. |
| `mode` | `"client"` \| `"server"` | `"client"` | `server` skips local filtering; `options` are the current results. |
| `loading` | `boolean` | `false` | Shows a spinner; keeps current options visible. |
| `onSearchChange` | `(search: string) => void` | — | Search text; debounced in server mode, and fired on open. |
| `searchDebounce` | `number` | `250` | Debounce in milliseconds (server mode). |
| `searchable` | `boolean` | `true` | Show the search box. When `false`, typing jumps to a matching option. |
| `hasMore` / `onLoadMore` | `boolean` / `() => void` | — | Paging: called when the list nears its end, plus a "Load more" button. |
| `filterFn` | `(option, search) => boolean` | — | Replaces the built-in matching (client mode). |
| `renderOption` | `(option, { selected, active }) => ReactNode` | — | Custom option content. |
| `allowCreate` / `onCreate` | `boolean` / `(label: string) => void` | — | Offers "Create …" when nothing matches. |
| `label`, `description`, `error` | `ReactNode` | — | Field label, hint and error message. `error` also marks the control invalid. |
| `placeholder` | `string` | `"Select…"` | Shown when nothing is selected. |
| `required`, `disabled` | `boolean` | `false` | Field states. |
| `clearable` | `boolean` | `true` | Show the clear button. |
| `size` | `"sm"` \| `"md"` \| `"lg"` | `"md"` | Control height and font size. |
| `name` | `string` | — | Posts hidden inputs for forms (one per value). |
| `maxHeight` | `number` | `280` | Max height of the list. |
| `virtualize` | `boolean` \| `number` | `true` | Virtualizes above 80 options; pass a number to change the threshold. |
| `emptyMessage` | `ReactNode` | "No options found" | Shown when nothing matches. |
| `className`, `classNames`, `style` | — | — | Styling hooks. Slots: `root`, `label`, `control`, `value`, `tag`, `popover`, `search`, `list`, `option`, `footer`. |
| `localeText` | `Partial<ComboboxLocaleText>` | English | Overrides UI text. |
| `onOpenChange` | `(open: boolean) => void` | — | Fires when the list opens or closes. |
| `ref` | `Ref<ComboboxHandle<V>>` | — | `open()`, `close()`, `toggle()`, `focus()`, `clear()`, `getValue()`, `getSelectedOptions()`. |

`Select` adds `value` / `defaultValue` (`V | null`) and `closeOnSelect`
(default `true`). `MultiSelect` adds `value` / `defaultValue` (`V[]`), `max`,
`maxVisibleTags` (default 3), `showSelectAll` (default `true`) and
`closeOnSelect` (default `false`).

## Server options

```tsx
const [search, setSearch] = useState("");
const [page, setPage] = useState(0);
const { data, isFetching } = useQuery({
  queryKey: ["people", search, page],
  queryFn: ({ signal }) => fetchPeople({ search, page, signal }),
  placeholderData: keepPreviousData,
});

<MultiSelect
  mode="server"
  options={data?.options ?? []}
  hasMore={data?.hasMore}
  loading={isFetching}
  onSearchChange={(term) => { setPage(0); setSearch(term); }}
  onLoadMore={() => setPage((p) => p + 1)}
  value={selected}
  onChange={setSelected}
/>;
```

- `onSearchChange` fires once when the list opens (so you can load a first page)
  and then debounced as the user types.
- Labels of chosen options are remembered, so tags stay readable after the
  results change. If you set `value` from outside before the matching options
  have loaded, the raw value is shown until they arrive.

## Keyboard

| Keys | Action |
| --- | --- |
| **Enter**, **Space**, **↓**, **↑** | Open the list. |
| **↓** / **↑** | Move between options (disabled options are skipped). |
| **Home** / **End** | First / last option. |
| **Page Down** / **Page Up** | Move ten options. |
| **Enter** | Choose the highlighted option, or create. |
| **Escape** | Close and return focus to the control. |
| **Tab** | Close and move to the next field. |
| **Backspace** | MultiSelect: remove the last tag (when the search box is empty). |
| typing | Types into the search box, or jumps to a matching option when `searchable={false}`. |

The control is a `role="combobox"` that owns a `role="listbox"`; the active
option is tracked with `aria-activedescendant`, so focus stays in the search
box. The list renders in the top layer through the native Popover API, so it is
never clipped by a scrolling parent (including inside a DataGrid cell).

## Theming

Override `--cb-*` variables (they default to the grid's `--dg-*`):

```css
.cb-root { --cb-accent: #7c3aed; --cb-radius: 12px; }
```

State attributes for styling: `data-state="open"`, `data-size`, `data-invalid`,
`data-disabled` on the root and control; `data-active`, `data-selected`,
`data-disabled` on options.

## Headless use

`useCombobox()` holds the whole engine (filtering, active option, keyboard,
selection, search requests) and is exported if you want to build a different UI
on top. The framework-free helpers — `filterOptions`, `buildListItems`,
`nextEnabledIndex`, `toggleValue`, `measureItems`, `getVisibleRange` — are
exported from `@/components/combobox/core` and can also run on a server.

## Known limits

- Option rows have a fixed height per `size` (taller when any option has a
  description), because the list is virtualized.
- No async "load option by value": pass options that include the selected
  values, or select them through the UI at least once.
- Tree or multi-level options are not supported.
