# Progress and CircularProgress

A bar, or a ring, for something with a known end: an upload, an import, a
quota. For React 19, styled to match the rest of the library. No runtime
dependencies besides React.

```ts
import { CircularProgress, Progress } from "@/components/progress";
import "@/components/progress/styles.css";
```

```tsx
<Progress label="Uploading report.pdf" value={62} showValue />
<Progress value={null} label="Preparing export" />            {/* length unknown */}
<Progress value={92} max={100} variant="warning" label="Storage" size="sm" />

<CircularProgress value={62} size={56} showValue />
```

**Progress:** `value` (`number | null`), `max`, `label`, `showValue`,
`valueText`, `variant` (`accent` `success` `warning` `danger`), `size` (`sm`
`md` `lg`), `classNames` (`root` `header` `label` `value` `track` `bar`),
`localeText`, `ref`, and every `<div>` attribute.

**CircularProgress:** the same value props, plus `size` (pixels), `thickness`,
`showValue` or `children` for the middle.

`value={null}` means the length is not known yet, which is a different thing
from zero: the bar sweeps, and `aria-valuenow` is left off entirely, which is
what makes a screen reader say "busy" instead of reading out a zero.

Use a **Spinner** when there is nothing to measure at all. A progress bar that
spends its life indeterminate is a spinner drawn as a promise it cannot keep.

`describeProgress` and `stepFraction` are exported from the framework-free
`core`. `describeProgress` is where a `max` of zero stops being a division by
zero, and where the drawn fraction stays unrounded so a 99.6% bar does not
reach the end early.
