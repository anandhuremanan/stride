# Pickers

Select, MultiSelect, DatePicker, DateRangePicker and FileUploader. They share the
field contract in `forms.md` (`label`, `description`, `error`, `size`,
`classNames`, `localeText`) but all four use **`onChange`**, not `onValueChange`.

## Select and MultiSelect

Import both from `component-lib/combobox`.

```ts
interface ComboboxOption<V = string> {
  value: V;              // string or number
  label: string;
  description?: string;  // second line
  group?: string;        // heading, in first-seen order
  disabled?: boolean;
  icon?: ReactNode;
  keywords?: string[];   // extra search terms
}
```

Shared props: `options` (required), `mode` (`client` | `server`), `loading`,
`onSearchChange`, `searchDebounce` (250), `searchable` (true), `hasMore`,
`onLoadMore`, `filterFn`, `renderOption`, `allowCreate`, `onCreate`, `label`,
`description`, `error`, `placeholder` ("Select…"), `required`, `disabled`,
`clearable` (true), `size`, `name`, `maxHeight` (280), `virtualize` (true above
80 options), `emptyMessage`, `className`, `style`, `localeText`,
`onOpenChange`, `ref`, and `classNames` (`root` `label` `control` `value` `tag`
`popover` `search` `list` `option` `footer`).

`Select` adds `value`/`defaultValue` (`V | null`) and `closeOnSelect` (true).
`MultiSelect` adds `value`/`defaultValue` (`V[]`), `max`, `maxVisibleTags` (3),
`showSelectAll` (true) and `closeOnSelect` (false).

`ref` gives `open()`, `close()`, `toggle()`, `focus()`, `clear()`, `getValue()`,
`getSelectedOptions()`.

```tsx
<Select label="Country" options={countries} value={country} onChange={setCountry} />
<MultiSelect label="Tags" options={tagOptions} value={tags} onChange={setTags} max={5} />
```

Server mode: set `mode="server"`, feed the current results as `options`, and
handle `onSearchChange` (fires once on open, then debounced) and `onLoadMore`.
There is no async "load option by value" — pass options that already include the
selected values.

## DatePicker and DateRangePicker

`value`, `defaultValue`, `min` and `max` accept a `Date`, an ISO `yyyy-mm-dd`
string or a timestamp. `onChange` always gives `Date` objects at local midnight.
`DateRangePicker.onChange` also receives a `complete` flag, `false` after the
first of two clicks.

Shared props: `min`, `max`, `isDateDisabled`, `locale`, `weekStartsOn`,
`format`, `numberOfMonths`, `showWeekNumbers`, `showToday`, `allowInput` (true),
`fixedWeeks` (true), `label`, `description`, `error`, `placeholder`, `required`,
`disabled`, `readOnly`.

```tsx
<DatePicker label="Start date" value={date} onChange={setDate} />
<DateRangePicker label="Period" value={range} onChange={setRange} />
```

## FileUploader

`multiple`, `accept`, `maxSize`, `endpoint`, `autoUpload`, `params`,
`fieldNames`, `onChange`, `onUploadComplete`, plus `label`, `description`,
`error`. Without an `endpoint` the files post with the surrounding form.

Each chunk is a `multipart/form-data` POST carrying `uploadId`, `fileName`,
`chunkIndex`, `totalChunks`, `fileSize`, `additionalParams` and `chunk`. Answer
2xx; the last body becomes `item.response`. 5xx/408/429 and network errors retry
with backoff; other 4xx fail the file.

```tsx
<FileUploader label="Attachments" multiple accept=".pdf,image/*"
  maxSize={20 * 1024 * 1024} endpoint="/api/upload"
  onUploadComplete={(items) => console.log(items.map((i) => i.response))} />
```

`useFileUploader()` exposes the same engine for a custom UI.
