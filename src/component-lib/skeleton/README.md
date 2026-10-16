# Skeleton

Placeholders for content that is loading, plus `Empty` for when there is nothing
to show. For React 19, with no runtime dependencies besides React.

```ts
import { Skeleton, Empty } from "@/components/skeleton";
import "@/components/skeleton/styles.css";
```

```tsx
{loading ? (
  <Skeleton lines={3} label="Loading activity" />
) : items.length === 0 ? (
  <Empty
    title="No activity yet"
    description="Once someone uploads a file, it will show up here."
    actions={<Button onClick={invite}>Invite your team</Button>}
  />
) : (
  <ActivityList items={items} />
)}
```

## Skeleton

| Prop | Default | Description |
| --- | --- | --- |
| `variant` | `text` | `text`, `circle` or `rect`. |
| `lines` / `lastLineWidth` | `1` / `60` | Bars for `text`, and how short the last one is. |
| `width` / `height` / `radius` | — | A number is pixels; a string is used as given. |
| `animation` | `pulse` | `pulse`, `wave` or `none`. |
| `label` | — | Announced while the placeholder is up. |
| `className`, `classNames`, `style` | — | Slots: `root`, `line`. |

The bars are hidden from assistive technology — a screen reader gains nothing
from the shape of a grey box. Use `label` here, or say the region is busy where
that makes more sense, so the wait is announced once rather than twice.

With more than one line the last is drawn short, because real text does not end
flush with the margin. A single line stays full width: one short bar reads as a
label rather than a sentence still loading.

Both animations stop under `prefers-reduced-motion`.

## Empty

| Prop | Description |
| --- | --- |
| `title` | What is missing, in a few words. |
| `description` | Why, and what to do about it. |
| `icon` | Decorative; hidden from assistive technology. |
| `actions` | The way out — usually one button. |
| `size` | `sm`, `md` or `lg`. `sm` suits a panel inside a page. |

It is a normal region, not a live one: an empty result is part of the page
rather than an alert, and a search that finds nothing should not interrupt what
someone is reading.
