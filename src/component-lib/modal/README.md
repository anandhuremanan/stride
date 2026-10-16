# Modal

A modal and drawer for React 19 on the native `<dialog>` element, styled to match
the rest of the library. No runtime dependencies besides React.

The browser provides the top layer, the inert page behind, the focus trap and
focus return. The component adds controlled state, dismiss rules, an
`onBeforeClose` guard, sizes, drawers and enter/exit animation.

## Setup

```ts
import { Modal } from "@/components/modal";
import "@/components/modal/styles.css";
```

## Usage

```tsx
const [open, setOpen] = useState(false);

<button onClick={() => setOpen(true)}>Edit</button>
<Modal
  open={open}
  onOpenChange={setOpen}
  title="Edit profile"
  footer={({ close }) => <button onClick={close}>Done</button>}
>
  …
</Modal>
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` / `defaultOpen` / `onOpenChange` | `boolean` / `boolean` / `(open, reason?) => void` | — / `false` | Controlled or uncontrolled state. `reason`: `escape`, `backdrop`, `close-button`, `api`. |
| `title`, `description`, `aria-label` | `ReactNode` / `string` | — | Header text; `aria-label` names an untitled modal. |
| `children`, `footer` | `ReactNode \| ({ close }) => ReactNode` | — | Body and footer. |
| `size` | `sm` \| `md` \| `lg` \| `xl` \| `full` | `md` | 400 / 520 / 720 / 960 px or the whole screen. |
| `placement` | `center` \| `top` \| `left` \| `right` \| `bottom` | `center` | `left`, `right` and `bottom` are drawers. |
| `closeButton`, `closeOnEscape`, `closeOnBackdrop` | `boolean` | `true` | Dismiss options. |
| `onBeforeClose` | `(reason) => boolean \| Promise<boolean>` | — | Return `false` to stay open. |
| `initialFocus` | `RefObject<HTMLElement>` | — | Otherwise `[data-autofocus]`, then the first focusable element. |
| `keepMounted` | `boolean` | `false` | Keep the content's state while closed. |
| `className`, `classNames`, `style`, `localeText`, `id`, `ref` | — | — | Slots: `root`, `header`, `title`, `description`, `close`, `body`, `footer`. `ref`: `open()`, `close()`, `getElement()`. |

## Known limits

- Exit animations need `transition-behavior: allow-discrete` (Chrome 117+, Safari 18+); elsewhere the modal closes instantly.
- Page scrolling is locked with `:root:has(.md-root[open])`, which can shift content by the scrollbar's width.
