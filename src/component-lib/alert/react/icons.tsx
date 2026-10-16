import {
  AlertCircleIcon,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
  XIcon as SharedX,
  type IconProps,
} from "../../shared/react/icons";
import type { AlertVariant } from "../core/types";

/** 14px, to sit in the corner without pulling the eye from the message. */
export const XIcon = (p: IconProps) => <SharedX width={14} height={14} {...p} />;

/** The glyph each variant carries, so colour is never the only signal. */
export const VARIANT_ICONS: Record<AlertVariant, (props: IconProps) => React.JSX.Element> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  danger: AlertCircleIcon,
  neutral: InfoIcon,
};
