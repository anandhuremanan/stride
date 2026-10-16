# Badge and Tag

Short labels for React 19, styled to match the rest of the library. A **Badge**
is static text — a status, a category, a count. A **Tag** is a chip the user can
take off. No runtime dependencies besides React.

```ts
import { Badge, Tag } from "@/components/badge";
import "@/components/badge/styles.css";
```

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="danger" appearance="solid" count={128} />   {/* 99+ */}
<Badge variant="warning" dot>Degraded</Badge>

<Tag onRemove={() => remove("berlin")}>Berlin</Tag>
```

**Badge:** `children` or `count`, `variant` (`neutral` `accent` `success`
`warning` `danger` `info`), `appearance` (`soft` `solid` `outline`), `size`
(`sm` `md`), `max`, `showZero`, `formatValue`, `dot`, `icon`, `classNames`
(`root` `dot` `icon` `label`), `ref`, and every `<span>` attribute.

**Tag:** the same variants, plus `onRemove`, `label` (names the remove button
when the children are not a plain string), `disabled`, `classNames` (`root`
`icon` `label` `remove`), `localeText`.

A badge with `count` renders nothing at all when the count is zero, unless
`showZero` says otherwise: an empty counter is noise on the page and a spurious
announcement in a screen reader.

The remove button carries the tag's own text in its name — "Remove Berlin" —
because a row of identical "Remove" buttons cannot be told apart by anyone
listening to it.

`formatCount` and `showCount` are exported from the framework-free `core`.
