# Toaster and toast

Notifications. `toast()` is callable from anywhere — components, event
handlers, data layers, even outside React. No hook, context or provider.

Mount `<Toaster />` **once**; call `toast()` from anywhere — components, event
handlers, data layers, even outside React. No hook, context or provider.

**Import from one path everywhere.** `toast()` and `<Toaster />` meet through a
shared module-level store; two import paths can create two stores.

```tsx
// once, near the root
import { Toaster } from "component-lib/toaster";
<Toaster />

// anywhere
import { toast } from "component-lib/toaster";

toast("Event created", { description: "Monday, 10:00" });
toast.success("Saved");
toast.error("Upload failed", { action: { label: "Retry", onClick: retry } });
toast.warning("Storage almost full");
toast.info("New version available");
const id = toast.loading("Uploading…");     // stays until updated
toast.update(id, { type: "success", title: "Uploaded" });
toast.dismiss(id);                          // or toast.dismiss() for all

toast.promise(saveUser(data), {
  loading: "Saving…",
  success: (user) => `${user.name} saved`,
  error: (error) => `Could not save: ${(error as Error).message}`,
});

toast.custom(({ dismiss }) => <MyCard onClose={dismiss} />);
```

Every call returns the toast's id; reusing an on-screen id updates that toast.

**Toast options:** `id`, `type` (`default` `success` `error` `warning` `info`
`loading`), `description`, `duration` (5000; `0`/`Infinity` stays),
`dismissible`, `action` / `cancel` (`{ label, onClick }`), `icon`, `className`,
`render`, `onDismiss`, `onAutoClose`.

**Toaster props:** `position` (`top-right`), `limit` (3), `duration` (5000),
`closeButton` (true), `hotkey` (`["altKey","KeyT"]`), `icons`, `store`, `dir`,
`className`, `classNames`, `style`, `localeText`.

Slots: `region`, `list`, `toast`, `icon`, `content`, `title`, `description`,
`actions`, `action`, `cancel`, `close`.

Timers pause while the pointer is over the stack, while focus is inside it, and
while the tab is hidden. The list is a polite live region; error toasts use
`role="alert"`. **Alt+T** moves focus to the notifications.

`toast()` does nothing during a server render — call it in the browser, e.g.
after a Server Action resolves.
