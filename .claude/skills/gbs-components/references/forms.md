# Forms

Every field is a real native control with the label, hint and error wired
around it. Pass `label`, `description` and `error` as props — never build that
markup yourself.

## The shared field contract

All of Input, Textarea, NumberInput, OtpInput, Checkbox, CheckboxGroup, Radio,
RadioGroup, Switch, Select, MultiSelect, DatePicker, DateRangePicker and
FileUploader accept:

- `label` (`ReactNode`) — the field's accessible name.
- `description` (`ReactNode`) — hint below the control, linked with `aria-describedby`.
- `error` (`ReactNode`) — message below the control; **also marks it invalid**.
- `size` — `"sm" | "md" | "lg"`, default `md`.
- `disabled`, `required` — native states.
- `classNames` — `Partial<Record<Slot, string>>`; slots differ per component.
- `localeText` — overrides the built-in UI strings.
- `className`, `style` — applied to the root element.

Ids come from `useId`; `describeField` (in `shared/core/field.ts`) builds the
describedby chain as `{id}-description` and `{id}-error`. Pass your own `id` to
override the generated one.

## Controlled vs uncontrolled

Every field supports both. Pass `value`/`checked` **with** its change handler
for controlled, or `defaultValue`/`defaultChecked` for uncontrolled. Mixing them
(a `value` with no handler) leaves the field frozen.

**The handler name differs per component:**

- `onValueChange(value: string)` — Input, OtpInput, Textarea
- `onValueChange(value: number | null)` — NumberInput
- `onValueChange(values: string[])` — CheckboxGroup
- `onValueChange(value: string | null)` — RadioGroup
- `onCheckedChange(checked: boolean)` — Checkbox
- `onCheckedChange(checked: boolean): void | Promise<unknown>` — Switch
- `onChange(value: V | null, option)` — Select
- `onChange(values: V[], options)` — MultiSelect
- `onChange(date: Date | null)` — DatePicker
- `onChange(range, complete: boolean)` — DateRangePicker

Input, Textarea and NumberInput also fire the native `onChange` alongside
`onValueChange`, so form libraries that hook the native event keep working.

## Native form posting

Give the field a `name` and it posts like a native control. `Select` and
`MultiSelect` render hidden inputs (one per value); FileUploader without an
`endpoint` posts the files with the form.

## Input

All `<input>` attributes, plus:

`value`, `defaultValue`, `onValueChange`, `label`, `description`, `error`,
`size`, `leading`, `trailing`, `clearable` (default `false`), `revealPassword`
(default `true`, for `type="password"`), `showCount`, `classNames`,
`localeText`, `ref` (the `<input>` element).

Slots: `root`, `label`, `control`, `input`, `description`, `error`, `count`.

```tsx
<Input label="Email" type="email" value={email} onValueChange={setEmail} clearable />
<Input label="Weight" trailing="kg" showCount maxLength={6} />
```

## OtpInput

One real `<input>` drawn as cells, so SMS autofill
(`autocomplete="one-time-code"`), paste and screen readers treat it as one field.

`length` (6), `mode` (`numeric` `alphanumeric` `alphabetic`), `uppercase`,
`value`, `defaultValue`, `onValueChange`, `onComplete`, `groups`, `mask`,
`label`, `description`, `error`, `size`, `name`, `required`, `disabled`,
`classNames` (`root` `label` `cells` `cell` `separator` `description` `error`),
`localeText`, `ref`.

```tsx
<OtpInput label="Code" groups={[3, 3]} onComplete={verify} />
```

## Textarea

All `<textarea>` attributes, plus `value`, `defaultValue`, `onValueChange`,
`label`, `description`, `error`, `size`, `autoResize`, `minRows`, `maxRows`,
`resize` (`none` `vertical` `horizontal` `both`), `showCount`, `localeText`,
`ref`, `classNames` (`root` `label` `textarea` `description` `error` `count`).

```tsx
<Textarea label="Notes" value={notes} onValueChange={setNotes}
  autoResize minRows={2} maxRows={8} maxLength={500} showCount />
```

## NumberInput

A text input with `role="spinbutton"`, not `<input type="number">` — so the
wheel cannot silently edit it, a partially typed number is not lost, and
locale notation like `1.234,56` parses.

`value`/`defaultValue`/`onValueChange` (`number | null`), `min`, `max`, `step`,
`largeStep`, `snapToStep`, `decimals`, `locale`, `format` (`decimal` `currency`
`percent`), `currency`, `useGrouping`, `clampBehavior` (`blur` `strict` `none`),
`stepper`, `wheel`, `selectOnFocus`, `clearable`, `label`, `description`,
`error`, `size`, `leading`, `trailing`, `disabled`, `readOnly`, `required`,
`localeText`, `ref`, every `<input>` attribute, and `classNames` (`root`
`label` `control` `input` `stepper` `description` `error`).

```tsx
<NumberInput label="Quantity" min={1} max={99} value={qty} onValueChange={setQty} />
<NumberInput label="Amount" format="currency" currency="USD" decimals={2} locale="en-US" />
{/* 45% in the field is 0.45 in the value */}
<NumberInput label="Discount" format="percent" step={0.01} min={0} max={1} />
```

Keyboard: ↑/↓ step, PageUp/PageDown by `largeStep`, Home/End jump to
`min`/`max`, Escape restores the last committed number.

## Checkbox and CheckboxGroup

The box is a real `<input type="checkbox">`.

**Checkbox:** `checked`/`defaultChecked` (`true`, `false` or `"indeterminate"`),
`onCheckedChange`, `value`, `label`, `description`, `error`, `size`, `ref`,
every `<input>` attribute, and `classNames` (`root` `control` `input` `label`
`description` `error`).

**CheckboxGroup:** `value`/`defaultValue`/`onValueChange` (string arrays),
`options` **or** `<Checkbox value>` children, `label` (a legend), `description`,
`error`, `required`, `disabled`, `name`, `size`, `orientation`, `selectAll`,
`localeText`, `classNames` (`root` `legend` `description` `items` `error`).

```tsx
<Checkbox label="Remember me" name="remember" checked={remember} onCheckedChange={setRemember} />

<CheckboxGroup label="Notify me by" name="channels" selectAll
  options={[{ value: "email", label: "Email" }, { value: "sms", label: "SMS" }]}
  value={channels} onValueChange={setChannels} />
```

## Radio and RadioGroup

Real `<input type="radio">` elements sharing a `name`, so arrow keys roam the
group, the group is one tab stop, and the browser validates it as one required
field.

**RadioGroup:** `value`/`defaultValue`/`onValueChange` (`string | null`),
`options` (plain strings or full option objects) **or** `<Radio value>`
children, `label` (a legend), `description`, `error`, `required`, `disabled`,
`name`, `size`, `orientation`, `variant` (`default` `card`), `clearable`,
`localeText`, `classNames` (`root` `legend` `description` `items` `clear`
`error`).

**Radio:** `value` (required), `label`, `description`, `error`, `size`,
`disabled`, `classNames`, `ref`, every `<input>` attribute.

```tsx
<RadioGroup label="Send the report" name="frequency"
  options={["Daily", "Weekly", "Monthly"]} value={freq} onValueChange={setFreq} />

{/* variant="card" draws tiles, for choices that need explaining. */}
<RadioGroup label="Plan" variant="card" defaultValue="team" options={[
  { value: "starter", label: "Starter", description: "Up to 3 projects" },
  { value: "team", label: "Team", description: "Unlimited projects" },
]} />
```

A radio cannot be unselected by clicking, so an optional question needs
`clearable` or a "None" option.

## Switch

Use a Switch when flipping it **is** the action; use a Checkbox when the value
is submitted later with a form.

`checked`/`defaultChecked`/`onCheckedChange` (may return a promise), `value`,
`label`, `description`, `error`, `size`, `labelPosition` (`end` `start`),
`loading`, `disabled`, `readOnly`, `required`, `name`, `localeText`, `ref`,
every `<input>` attribute, and `classNames` (`root` `control` `input` `track`
`thumb` `label` `description` `error`).

Return a promise from `onCheckedChange` and the switch shows the new setting,
spins while it saves, and reverts if the save fails.

```tsx
<Switch label="Two-factor authentication" checked={enabled}
  onCheckedChange={(next) => api.setTwoFactor(next)} />
```

## Select, DatePicker, FileUploader

Those live in `pickers.md` — they are the fields that take `onChange` rather
than `onValueChange`.

## Validation

There is no form library here. Compute the message yourself and pass it as
`error`; the component handles `aria-invalid`, `aria-describedby` and the
styling. With React Hook Form or similar, wire `value` and the component's own
handler name, and pass `error={errors.field?.message}`.
