# DatePicker and DateRangePicker

Two date fields built on one engine and styled to match the DataGrid and the
Combobox. No runtime dependencies besides React 19.

- **`<DatePicker>`** — one date.
- **`<DateRangePicker>`** — a start and an end, with a live preview between them.

Both support typed entry in the user's own date order, min/max limits, blocked
days, month and year panels, week numbers, forms, full keyboard control, dark
mode and right-to-left layouts.

## Setup

```ts
import { DatePicker, DateRangePicker } from "@/components/date-picker";
import "@/components/date-picker/styles.css";
```

The stylesheet reads the shared `--gbs-*` variables when you set them on
`:root`, so every component in the library shares one theme, and falls back to
the same default palette otherwise.

## Basic usage

```tsx
const [date, setDate] = useState<Date | null>(null);

<DatePicker label="Start date" value={date} onChange={setDate} />;

const [range, setRange] = useState<DateRange>({ start: null, end: null });

<DateRangePicker label="Period" value={range} onChange={setRange} />;
```

Both are controlled with `value` + `onChange`, or uncontrolled with
`defaultValue`. `value`, `defaultValue`, `min` and `max` accept a `Date`, an ISO
`yyyy-mm-dd` string or a timestamp; `onChange` always gives you `Date` objects at
local midnight. The range picker's `onChange` also receives a `complete` flag,
which is `false` after the first of the two clicks.

## Props

Shared by both components:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `min` / `max` | `Date \| string \| number` | — | Earliest and latest selectable day. |
| `isDateDisabled` | `(date: Date) => boolean` | — | Called per rendered day; return true to block it. |
| `locale` | `string` | runtime locale | Decides month names, field order and the first day of the week. |
| `weekStartsOn` | `0`–`6` | locale's first day | 0 is Sunday. |
| `format` | `Intl.DateTimeFormatOptions \| (date, locale) => string` | `{ year, month: "short", day }` | How the chosen date is written in the field. |
| `numberOfMonths` | `number` | `1` (range: `2`) | Months shown side by side. |
| `showWeekNumbers` | `boolean` | `false` | Adds an ISO week column. |
| `showToday` | `boolean` | `true` (range: `false`) | The "Today" shortcut in the footer. |
| `allowInput` | `boolean` | `true` | Let people type a date. When false the field is read-only and opens on click. |
| `fixedWeeks` | `boolean` | `true` | Always six week rows, so the popover never changes height. |
| `label`, `description`, `error` | `ReactNode` | — | Field label, hint and error message. `error` also marks the control invalid. |
| `placeholder` | `string` | the locale's pattern | e.g. `dd/mm/yyyy`. |
| `required`, `disabled`, `readOnly` | `boolean` | `false` | Field states. |
| `clearable` | `boolean` | `true` | Show the clear button. |
| `size` | `"sm"` \| `"md"` \| `"lg"` | `"md"` | Control height and font size. |
| `name` | `string` | — | Posts `yyyy-mm-dd` in a hidden input. The range picker posts `name-start` and `name-end`. |
| `className`, `classNames`, `style` | — | — | Styling hooks. Slots: `root`, `label`, `control`, `input`, `popover`, `calendar`, `day`, `footer`, `presets`. |
| `localeText` | `Partial<DatePickerLocaleText>` | English | Overrides UI text. |
| `onOpenChange` | `(open: boolean) => void` | — | Fires when the calendar opens or closes. |
| `ref` | `Ref<DatePickerHandle<T>>` | — | `open()`, `close()`, `toggle()`, `focus()`, `clear()`, `getValue()`. |

`DatePicker` adds `value` / `defaultValue` (`Date \| null`) and `closeOnSelect`
(default `true`). `DateRangePicker` adds `value` / `defaultValue`
(`{ start, end }`), `presets` and `closeOnSelect` (closes once both ends are set).

## Typed entry

People can type instead of picking. Input is read in the locale's own field
order, so `03/04/2026` is 3 April in `en-GB` and 4 March in `en-US`. ISO
(`2026-03-12`) is accepted in every locale, month names work (`12 Mar 2026`), and
a missing year or month falls back to the month on screen. The calendar follows
along as you type. Text that isn't a date, or a date outside the limits, shows a
message when the field loses focus and leaves the value untouched.

## Range presets

```tsx
<DateRangePicker
  value={range}
  onChange={setRange}
  presets={[
    { label: "Last 7 days", range: { start: addDays(new Date(), -6), end: new Date() } },
    { label: "This month", range: { start: startOfMonth(new Date()), end: new Date() } },
  ]}
/>
```

## Keyboard

| Keys | Action |
| --- | --- |
| **Enter**, **↓** | Open the calendar (from the field). |
| **←** / **→** | Previous / next day (swapped in right-to-left layouts). |
| **↑** / **↓** | Same weekday, previous / next week. |
| **Home** / **End** | First / last day of the week. |
| **Page Up** / **Page Down** | Previous / next month. |
| **Shift + Page Up/Down** | Previous / next year. |
| **Enter**, **Space** | Choose the focused day. |
| **Escape** | Close and return focus to the calendar button. |

Each month is a `role="grid"` where only the focused day is tabbable, which is
the WAI-ARIA pattern for a date picker. The calendar renders in the top layer
through the native Popover API, so it is never clipped by a scrolling parent
(including inside a DataGrid cell).

## Theming

Override `--dp-*` variables (they default to the grid's `--dg-*`):

```css
.dp-root { --dp-accent: #7c3aed; --dp-radius: 12px; --dp-day-size: 38px; }
```

State attributes for styling: `data-state="open"`, `data-size`, `data-invalid`,
`data-disabled` on the root and control; `data-today`, `data-selected`,
`data-outside`, `data-weekend` on days; `data-in-range`, `data-range-start`,
`data-range-end` on day cells.

## Headless use

`useDatePicker()` holds the whole engine (selection, visible months, typed
input, keyboard movement, popover state) and is exported if you want a different
UI on top. The framework-free helpers — `buildMonth`, `buildMonths`, `parseDate`,
`formatDate`, `moveByKey`, `normalizeRange`, `isInRange`, `toISODate` — are
exported from `@/components/date-picker/core` and also run on a server.

## Known limits

- Dates only: no time-of-day or time zone selection. Values are local midnight.
- One range per field; multiple disjoint ranges aren't supported.
- Only the Gregorian calendar is handled, though month and weekday names,
  field order and the first day of the week all follow the locale.
- When rendering on a server, pass `locale` explicitly so the server and the
  browser format the field identically.
