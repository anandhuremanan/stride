/**
 * Sets an input's value the way typing does: through the prototype setter,
 * followed by a bubbling `input` event. React's `onChange`, form libraries and
 * native listeners all see the change, controlled or not.
 */
export function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
