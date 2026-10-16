# Data display

The DataGrid has its own file: `data-grid.md`.

## Tabs

```tsx
<Tabs defaultValue="overview">
  <TabList aria-label="Project">
    <Tab value="overview">Overview</Tab>
    <Tab value="activity" badge={3}>Activity</Tab>
    <Tab value="billing" disabled>Billing</Tab>
  </TabList>
  <TabPanel value="overview">…</TabPanel>
  <TabPanel value="activity">…</TabPanel>
</Tabs>
```

**Tabs:** `value`/`defaultValue`/`onValueChange`, `orientation` (`horizontal`
`vertical`), `activation` (`automatic` `manual`), `variant` (`line` `pills`
`enclosed`), `size`, `keepMounted`.
**Tab:** `value` (required), `disabled`, `icon`, `badge`.
**TabPanel:** `value` (required), `keepMounted`.

`TabList`, `Tab` and `TabPanel` throw outside `<Tabs>`. Arrow keys move between
tabs (swapped in RTL), Home/End jump, disabled tabs are skipped. `keepMounted`
preserves hidden panels' state using React's `<Activity>`.

## Accordion

Built on native `<details>`/`<summary>`.

```tsx
<Accordion defaultValue={["shipping"]} items={[
  { value: "shipping", title: "Shipping", content: <p>Two to five days.</p> },
  { value: "returns", title: "Returns", content: <p>Thirty days.</p> },
]} />

<Accordion multiple variant="contained">
  <AccordionItem value="one" title="Details" meta={<Badge count={3} />}>…</AccordionItem>
</Accordion>
```

**Accordion:** `value`/`defaultValue`/`onValueChange` (string arrays), `items`
**or** `<AccordionItem>` children, `multiple`, `collapsible`, `variant`
(`separated` `contained` `plain`), `size`, `iconPosition`, `classNames`, `ref`.
**AccordionItem:** `value` (required), `title`, `description`, `children`,
`meta`, `icon`, `disabled`, `classNames` (`root` `header` `title` `description`
`icon` `content` `body`), `ref` (the `<details>`).

`AccordionItem` throws outside `<Accordion>`.

## Card and Stat

```tsx
<Card>
  <CardHeader title={<h3>Revenue</h3>} actions={<Menu trigger={…}>…</Menu>} />
  <CardBody>
    <Stat label="This month" value="£48,120"
      trend={{ direction: trendDirection(12.4), label: "12.4%", description: "vs last month" }} />
  </CardBody>
</Card>
```

**Card:** `variant` (`outlined` `elevated` `plain`), `padding` (`none` `sm` `md`
`lg`), `href`/`target`/`rel` (renders an `<a>`), `interactive`, `className`,
`classNames` (`root` `header` `title` `description` `actions` `body` `footer`),
`style`.
**CardHeader:** `title`, `description`, `actions`. Pass your own heading element
as `title` so the page owns the outline level.
**Stat:** `label` and `value` (both required), `trend`, `help`, `icon`,
`loading`, plus styling props.

With `href` the card is an `<a>` — keep other links and buttons out of it; use
`interactive` plus your own handler instead.

## Alert

```tsx
<Alert variant="warning" title="Your trial ends in 3 days">
  After that the workspace becomes read-only.
</Alert>
<Alert variant="danger" title="We could not save your changes" onDismiss={hide} />
```

`variant` (`info` `success` `warning` `danger` `neutral`), `size` (`sm` `md`),
`title`, `description` or `children`, `icon` (a node, or `false`), `actions`,
`onDismiss`, `classNames` (`root` `icon` `content` `title` `description`
`actions` `dismiss`), `localeText`, `ref`, and every `<div>` attribute.

Problems get `role="alert"` and interrupt; everything else gets `role="status"`.
An alert present from first render announces nothing — live regions only speak
on change.

## Badge and Tag

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="danger" appearance="solid" count={128} />
<Tag onRemove={() => remove("berlin")}>Berlin</Tag>
```

**Badge:** `children` or `count`, `variant` (`neutral` `accent` `success`
`warning` `danger` `info`), `appearance` (`soft` `solid` `outline`), `size`
(`sm` `md`), `max`, `showZero`, `formatValue`, `dot`, `icon`, `classNames`
(`root` `dot` `icon` `label`), `ref`, and every `<span>` attribute.
**Tag:** the same variants plus `onRemove`, `label` (names the remove button when
the children are not a plain string), `disabled`, `classNames` (`root` `icon`
`label` `remove`), `localeText`.

A `count` of zero renders nothing unless `showZero`.

## Avatar and AvatarGroup

**Avatar:** `name` (alt text, initials and a stable colour), `src`, `initials`,
`children`, `size` (`md`, 32px), `shape` (`circle`), `status`, `decorative`,
`className`, `classNames`, `style`, `localeText`, `ref`, and every `<span>`
attribute. A failed image falls back to initials.
**AvatarGroup:** `children` (required), `max` (4, counting the overflow bubble),
`size`, `shape`, `label` (names the set), plus the usual styling props.

## Progress and CircularProgress

```tsx
<Progress label="Uploading report.pdf" value={62} showValue />
<Progress value={null} label="Preparing export" />
<CircularProgress value={62} size={56} showValue />
```

**Progress:** `value` (`number | null`), `max`, `label`, `showValue`,
`valueText`, `variant` (`accent` `success` `warning` `danger`), `size` (`sm`
`md` `lg`), `classNames` (`root` `header` `label` `value` `track` `bar`),
`localeText`, `ref`, and every `<div>` attribute.
**CircularProgress:** the same value props plus `size` (pixels), `thickness`,
`showValue` or `children` for the middle.

`value={null}` is indeterminate: `aria-valuenow` is omitted, so a screen reader
says "busy". Use a Spinner when there is nothing to measure at all.

## Skeleton and Empty

```tsx
{loading ? <Skeleton lines={3} label="Loading activity" />
 : items.length === 0 ? <Empty title="No activity yet" description="…" actions={<Button…/>} />
 : <ActivityList items={items} />}
```

**Skeleton:** `variant` (`text` `circle` `rect`), `lines` (1),
`lastLineWidth` (60), `width`, `height`, `radius` (number = pixels, string used
as given), `animation` (`pulse` `wave` `none`), `label`, `className`,
`classNames` (`root` `line`), `style`. Bars are hidden from assistive tech;
`label` is what gets announced.
**Empty:** `title`, `description`, `actions`.

## Spinner

```tsx
<Spinner />
<Spinner size="sm" showLabel label="Saving…" />
<Spinner loading={isPending} delay={250} minDuration={600}><Chart /></Spinner>
```

`loading` (true; with children, covers them), `size` (`xs` 12 · `sm` 16 · `md`
24 · `lg` 32 · `xl` 48, or a pixel number), `variant` (`ring` `dots`), `label`
("Loading"), `showLabel`, `delay` (0), `minDuration` (0), `className`,
`classNames` (`root` `status` `indicator` `label` `content` `overlay`), `style`,
`localeText`. `useDelayedLoading(loading, { delay, minDuration })` applies the
same timing to any loading UI.

## Breadcrumb

```tsx
<Breadcrumb
  items={[{ label: "Home", href: "/" }, { label: "Invoices", href: "/invoices" },
          { label: "INV-2026-0042" }]}
  maxItems={4}
  renderLink={(props) => <Link {...props} />}
  structuredData={{ baseUrl: "https://app.example.com" }} />
```

`items` (required; `{ label, href?, icon?, name?, onClick? }`, top level first,
last is the current page), `separator`, `maxItems`, `itemsBeforeCollapse` (1),
`itemsAfterCollapse` (1), `renderLink`, `structuredData`, `size` (`md`),
`className`, `classNames` (`root` `list` `item` `link` `current` `separator`
`ellipsis`), `localeText`. Use `renderLink` for a router link — no `asChild`.
