# Toaster

Notifications for any React 19 app — Vite, Next.js, Remix or plain React — styled
to match the DataGrid, Combobox and DatePicker. No runtime dependencies besides
React.

- **`<Toaster />`** — mount once; renders the toasts.
- **`toast()`** — call from anywhere: components, event handlers, data layers,
  even code outside React. No hook, context or provider.

## Setup

```ts
import { toast, Toaster } from "@/components/toaster";
import "@/components/toaster/styles.css";
```

```tsx
// Once, near the root of the app (e.g. app/layout.tsx or App.tsx)
<Toaster />

// Anywhere
toast.success("Settings saved");
```

Import from one path everywhere. `toast()` and `<Toaster />` meet through a
shared store, and a bundler that sees two import paths may create two stores.

## Showing toasts

```tsx
toast("Event created", { description: "Monday, 10:00" });
toast.success("Saved");
toast.error("Upload failed", { action: { label: "Retry", onClick: retry } });
toast.warning("Storage almost full");
toast.info("New version available");
const id = toast.loading("Uploading…");       // stays until updated

toast.update(id, { type: "success", title: "Uploaded" });
toast.dismiss(id);                             // or toast.dismiss() for all

toast.promise(saveUser(data), {
  loading: "Saving…",
  success: (user) => `${user.name} saved`,
  error: (error) => `Could not save: ${(error as Error).message}`,
});

toast.custom(({ dismiss }) => <MyCard onClose={dismiss} />);
```

Every call returns the toast's id. Passing an `id` that is already on screen
updates that toast instead of adding another.

## Toast options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | generated | Reuse to update a toast in place. |
| `type` | `"default"` \| `"success"` \| `"error"` \| `"warning"` \| `"info"` \| `"loading"` | `"default"` | Icon, color bar and announcement. |
| `description` | `ReactNode` | — | Second line. |
| `duration` | `number` | `5000` (loading: stays) | Milliseconds. `0` or `Infinity` stays until dismissed. |
| `dismissible` | `boolean` | `true` | Close button, Escape and swipe. |
| `action` / `cancel` | `{ label, onClick(event) }` | — | Buttons. The toast closes after a click unless `event.preventDefault()` is called. |
| `icon` | `ReactNode` | the type's icon | `null` hides it. |
| `className` | `string` | — | Class for this toast. |
| `render` | `({ id, dismiss }) => ReactNode` | — | Custom body (`toast.custom` sets it). |
| `onDismiss` / `onAutoClose` | `(toast) => void` | — | Closed by someone, or because time ran out. |

## Toaster props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `position` | `"top-left"` \| `"top-center"` \| `"top-right"` \| `"bottom-left"` \| `"bottom-center"` \| `"bottom-right"` | `"top-right"` | Where the stack sits. Full width on narrow screens. |
| `limit` | `number` | `3` | Toasts on screen at once. The rest wait, with their timers held. |
| `duration` | `number` | `5000` | Default auto-close delay. |
| `closeButton` | `boolean` | `true` | Close button on dismissible toasts. |
| `hotkey` | `string[]` | `["altKey", "KeyT"]` | Moves focus to the notifications. `[]` turns it off. |
| `icons` | `Partial<Record<ToastType, ReactNode>>` | — | Replace icons per type; `null` hides one. |
| `store` | `ToastStore` | the `toast()` store | For a separate notification area. |
| `dir` | `"ltr"` \| `"rtl"` \| `"auto"` | inherited | Text direction. |
| `className`, `classNames`, `style` | — | — | Slots: `region`, `list`, `toast`, `icon`, `content`, `title`, `description`, `actions`, `action`, `cancel`, `close`. |
| `localeText` | `Partial<ToasterLocaleText>` | English | `regionLabel(hotkey)`, `close`. |

## Behavior

- Timers pause while the pointer is over the toasts, while focus is inside them,
  and while the browser tab is hidden.
- Toasts beyond `limit` wait with their full time and appear as others close.
- Toasts render in a portal on `<body>`, so no parent's overflow, transform or
  z-index can hide them.

## Keyboard and accessibility

| Keys | Action |
| --- | --- |
| **Alt + T** | Move focus to the notifications (configurable with `hotkey`). |
| **Tab** | Move between toasts and their buttons. |
| **Escape** | Dismiss the focused toast. |
| swipe sideways | Dismiss (touch, pen or mouse). |

The list is a polite live region, always in the page, so new toasts are read out
without interrupting. Error toasts use `role="alert"` and interrupt. The region is
a labelled landmark ("Notifications (Alt+T)").

## Theming

Override `--ts-*` variables (they default to the grid's `--dg-*`). Toasts render
on `<body>`, so set shared `--dg-*` values on `:root`:

```css
.ts-region { --ts-width: 420px; --ts-success: #059669; --ts-radius: 12px; }
```

State attributes: `data-position` on the region; `data-type`, `data-state`
(`open` / `closing`), `data-custom`, `data-swiping` on toasts.

## Headless use

`useToasts(store?)` returns the live snapshot (`toasts`, `paused`, `limit`) for a
custom UI, and `visibleToasts(snapshot)` picks the ones to show.
`createToastStore()` and `createToastApi(store)` build separate instances. All of
`core` runs without React.

## Known limits

- One stack per `<Toaster />`; toasts don't collapse into an expandable pile.
- `toast()` does nothing during a server render or in server code. Call it in
  the browser, e.g. after a Server Action resolves.
