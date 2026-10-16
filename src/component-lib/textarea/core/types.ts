export type FieldSize = "sm" | "md" | "lg";

export type TextareaResize = "none" | "vertical" | "horizontal" | "both";

/** Vertical measurements of a textarea, in pixels. */
export interface BoxMetrics {
  lineHeight: number;
  /** Top plus bottom padding. */
  paddingBlock: number;
  /** Top plus bottom border. */
  borderBlock: number;
}

export interface TextareaLocaleText {
  /** `max` is set when the field has a `maxLength`. */
  characterCount(count: string, max?: string): string;
}
