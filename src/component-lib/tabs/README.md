# Tabs

Accessible tabs for React 19 following the WAI-ARIA tabs pattern, styled to
match the rest of the library. No runtime dependencies besides React.

```ts
import { Tab, TabList, TabPanel, Tabs } from "@/components/tabs";
import "@/components/tabs/styles.css";
```

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

**Tabs:** `value` / `defaultValue` / `onValueChange`, `orientation`
(`horizontal` `vertical`), `activation` (`automatic` `manual`), `variant` (`line`
`pills` `enclosed`), `size`, `keepMounted`.
**Tab:** `value`, `disabled`, `icon`, `badge`.
**TabPanel:** `value`, `keepMounted`.

Arrow keys move between tabs (swapped in right-to-left layouts), Home and End
jump, and disabled tabs are skipped. `keepMounted` keeps hidden panels' state
using React's `<Activity>`. `nextTab` and `tabDomId` are exported from the
framework-free `core`.
