# Breadcrumb

A breadcrumb trail for React 19, styled to match the rest of the library. No
runtime dependencies besides React.

```ts
import { Breadcrumb } from "@/components/breadcrumb";
import "@/components/breadcrumb/styles.css";
```

```tsx
<Breadcrumb
  items={[
    { label: "Home", href: "/" },
    { label: "Invoices", href: "/invoices" },
    { label: "INV-2026-0042" },
  ]}
  maxItems={4}
  renderLink={(props) => <Link {...props} />}
  structuredData={{ baseUrl: "https://app.example.com" }}
/>
```

| Prop | Default | Description |
| --- | --- | --- |
| `items` | required | `{ label, href?, icon?, name?, onClick? }`, top level first; the last is the current page. |
| `separator` | chevron | Between crumbs. |
| `maxItems`, `itemsBeforeCollapse`, `itemsAfterCollapse` | —, `1`, `1` | Collapse the middle of long trails behind an ellipsis. |
| `renderLink` | `<a>` | Draw links with your router. |
| `structuredData` | `false` | Adds schema.org `BreadcrumbList` JSON-LD; pass `{ baseUrl }`. |
| `size`, `className`, `classNames`, `localeText` | `md` | Slots: `root` `list` `item` `link` `current` `separator` `ellipsis`. |

`collapseItems` and `toBreadcrumbJsonLd` are exported from the framework-free
`core`.
