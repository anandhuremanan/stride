# Button

A button for React 19 with variants, sizes, icons and a loading state that
manages itself, styled to match the rest of the library. No runtime
dependencies besides React.

```ts
import { Button } from "@/components/button";
import "@/components/button/styles.css";
```

```tsx
<Button onClick={async () => await save()}>Save</Button>          {/* spinner while the promise runs */}
<Button type="submit">Create</Button>                            {/* spinner while the form's Server Action runs */}
<Button variant="outline" leading={<PlusIcon />}>New invoice</Button>
<Button variant="ghost" icon={<TrashIcon />} aria-label="Delete" />
<Button render={(props) => <Link href="/billing" {...props} />}>Billing</Button>
```

| Prop | Default | Description |
| --- | --- | --- |
| `variant` | `primary` | `primary`, `secondary`, `outline`, `ghost`, `danger`, `link`. |
| `size` | `md` | `sm` 30 · `md` 36 · `lg` 44 px. |
| `type` | `button` | Not `submit`, so buttons inside forms don't submit by accident. |
| `loading` / `loadingText` | `false` / — | Busy state; stays focusable and keeps its width. |
| `leading`, `trailing`, `icon` | — | Icons; `icon` alone makes an icon-only button (add `aria-label`). |
| `fullWidth` | `false` | Fill the container. |
| `onClick` | — | Return a promise to show loading until it settles. |
| `render` | — | Render another element (e.g. a router link) with the button's look. |
| `className`, `classNames`, `localeText`, `ref` | — | Slots: `root`, `content`, `spinner`, `icon`. |

Every other `<button>` attribute passes through.
