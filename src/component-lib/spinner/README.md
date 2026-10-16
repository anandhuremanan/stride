# Spinner

A loading indicator for React 19, on its own or covering busy content, styled to
match the rest of the library. No runtime dependencies besides React.

```ts
import { Spinner, useDelayedLoading } from "@/components/spinner";
import "@/components/spinner/styles.css";
```

```tsx
<Spinner />                                   {/* 24 px ring in the current text color */}
<Spinner size="sm" showLabel label="Saving…" />
<Spinner loading={isPending} delay={250} minDuration={600}>
  <Chart />                                   {/* covered and inert while loading */}
</Spinner>
```

| Prop | Default | Description |
| --- | --- | --- |
| `loading` | `true` | With children, covers them while true. |
| `size` | `md` | `xs` 12 · `sm` 16 · `md` 24 · `lg` 32 · `xl` 48, or pixels. |
| `variant` | `ring` | `ring` or `dots`. |
| `label` / `showLabel` | "Loading" / `false` | Announced text; optionally shown. |
| `delay` / `minDuration` | `0` / `0` | Wait before showing; stay at least this long once shown. |
| `className`, `classNames`, `style`, `localeText` | — | Slots: `root`, `status`, `indicator`, `label`, `content`, `overlay`. |

`useDelayedLoading(loading, { delay, minDuration })` applies the same timing to
any loading UI. `stepVisibility` is the framework-free rule behind it.
