# Card

A surface that groups related content, plus `Stat` for a single figure. For
React 19, with no runtime dependencies besides React.

```ts
import { Card, CardHeader, CardBody, CardFooter, Stat, trendDirection } from "@/components/card";
import "@/components/card/styles.css";
```

```tsx
<Card>
  <CardHeader title={<h3>Revenue</h3>} actions={<Menu trigger={<Button variant="ghost">…</Button>}>…</Menu>} />
  <CardBody>
    <Stat
      label="This month"
      value="£48,120"
      trend={{ direction: trendDirection(12.4), label: "12.4%", description: "vs last month" }}
    />
  </CardBody>
</Card>
```

## Card

| Prop | Default | Description |
| --- | --- | --- |
| `variant` | `outlined` | `outlined`, `elevated` or `plain`. |
| `padding` | `md` | `none`, `sm`, `md` or `lg`. |
| `href` / `target` / `rel` | — | Makes the whole card a link. |
| `interactive` | `false` | Hover and focus styles for a card clickable another way. |
| `className`, `classNames`, `style` | — | Slots: `root`, `header`, `title`, `description`, `actions`, `body`, `footer`. |

`CardHeader` takes `title`, `description` and `actions`. Pass your own heading
element as the title — `<h3>Revenue</h3>` — so the page decides the level; a card
is not always at the same depth in the outline.

When `href` is set the card renders as an `<a>`, so keep other links and buttons
out of it: nesting interactive elements is not valid HTML and traps the
keyboard. Use `interactive` with your own handler instead.

## Stat

| Prop | Description |
| --- | --- |
| `label` / `value` | Always both: a number on its own means nothing. |
| `trend` | `{ direction, label, invert?, description? }`. |
| `help` | A note under the figure. |
| `icon` | Drawn beside the label. |
| `loading` | Placeholder bars, announced as "Loading". |

`trend.invert` is for figures where down is the good outcome, such as churn or
error rates: it changes the colour, and the arrow still points the way the
number actually moved. The direction is also written out for screen readers, so
the meaning never rests on colour alone.

`trendDirection(change, threshold?)`, `isPositive(direction, invert?)` and
`percentChange(from, to)` are framework-free helpers in `core/trend.ts`.
`percentChange` returns `null` when the starting value is zero, because growth
from nothing is not a percentage.
