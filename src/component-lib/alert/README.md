# Alert

A message that stays in the page: a trial ending, a read-only record, the
summary above a form that failed validation. For React 19, styled to match the
rest of the library. No runtime dependencies besides React.

```ts
import { Alert } from "@/components/alert";
import "@/components/alert/styles.css";
```

```tsx
<Alert variant="warning" title="Your trial ends in 3 days">
  After that the workspace becomes read-only. <a href="/billing">Add a card</a> to keep it.
</Alert>

<Alert variant="danger" title="We could not save your changes" onDismiss={() => setShown(false)} />

<Alert variant="success" size="sm">240 rows imported.</Alert>
```

**Props:** `variant` (`info` `success` `warning` `danger` `neutral`), `size`
(`sm` `md`), `title`, `description` or `children`, `icon` (a node, or `false`),
`actions`, `onDismiss`, `classNames` (`root` `icon` `content` `title`
`description` `actions` `dismiss`), `localeText`, `ref`, and every `<div>`
attribute.

Which one to reach for:

| | Interrupts | Lives | Use for |
| --- | --- | --- | --- |
| **Dialog** | Yes, blocks | Top layer | A decision that must happen now |
| **Toast** | No, and leaves | A corner | Confirming what already happened |
| **Alert** | No, and stays | In the layout | The state a page or section is in |

`liveness(variant)` is exported from the framework-free `core`: problems get
`role="alert"` and interrupt; everything else gets `role="status"` and waits its
turn. An alert that was on the page from the start announces nothing either
way, because a live region only speaks when its contents change.
