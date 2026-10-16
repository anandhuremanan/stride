# Textarea

A multi-line text field for React 19 with label, hint, error, character counter
and auto-resize, styled to match the rest of the library. No runtime
dependencies besides React.

## Setup

```ts
import { Textarea } from "@/components/textarea";
import "@/components/textarea/styles.css";
```

## Usage

```tsx
<Textarea
  label="Notes"
  value={notes}
  onValueChange={setNotes}
  autoResize
  minRows={2}
  maxRows={8}
  maxLength={500}
  showCount
/>
```

## Props

All `<textarea>` attributes plus `value`, `defaultValue`, `onValueChange`,
`label`, `description`, `error`, `size` (`sm` `md` `lg`), `autoResize`, `minRows`,
`maxRows`, `resize` (`none` `vertical` `horizontal` `both`), `showCount`,
`classNames` (`root` `label` `textarea` `description` `error` `count`),
`localeText`, and `ref` (the `<textarea>`).

Auto-resize uses CSS `field-sizing: content` where supported and measures the
text elsewhere. `countCharacters` and `fitHeight` are exported from the
framework-free `core`.
