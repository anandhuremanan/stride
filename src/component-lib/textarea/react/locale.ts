import type { TextareaLocaleText } from "../core/types";

export const defaultTextareaText: TextareaLocaleText = {
  characterCount: (count, max) => (max === undefined ? count : `${count} / ${max}`),
};
