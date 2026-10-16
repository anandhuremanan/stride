# Checkbox and CheckboxGroup

Checkboxes for React 19, styled to match the rest of the library. The box is a
real `<input type="checkbox">`, so forms, form libraries and assistive
technology work as they do natively. No runtime dependencies besides React.

```ts
import { Checkbox, CheckboxGroup } from "@/components/checkbox";
import "@/components/checkbox/styles.css";
```

```tsx
<Checkbox label="Remember me" name="remember" checked={remember} onCheckedChange={setRemember} />

<CheckboxGroup
  label="Notify me by"
  name="channels"
  options={[{ value: "email", label: "Email" }, { value: "sms", label: "SMS" }]}
  value={channels}
  onValueChange={setChannels}
  selectAll
/>
```

**Checkbox:** `checked` / `defaultChecked` (`true`, `false`, `"indeterminate"`),
`onCheckedChange`, `value`, `label`, `description`, `error`, `size`, `classNames`
(`root` `control` `input` `label` `description` `error`), `ref` (the `<input>`), and
every `<input>` attribute.

**CheckboxGroup:** `value` / `defaultValue` / `onValueChange` (string arrays),
`options` or `<Checkbox value>` children, `label` (legend), `description`,
`error`, `required`, `disabled`, `name`, `size`, `orientation`, `selectAll`,
`classNames` (`root` `legend` `description` `items` `error`), `localeText`.

`toggleValue`, `groupState` and `toggleAll` are exported from the
framework-free `core`.
