import {
  AlertCircleIcon,
  InfoIcon as SharedInfo,
  SpinnerIcon as SharedSpinner,
  SuccessIcon as SharedSuccess,
  WarningIcon as SharedWarning,
  XIcon as SharedX,
  type IconProps,
} from "../../shared/react/icons";
import { cx } from "./props";

/*
 * A toast draws its status icon at 18px and its close button at 14px.
 */
export const SuccessIcon = (p: IconProps) => <SharedSuccess width={18} height={18} {...p} />;
export const ErrorIcon = (p: IconProps) => <AlertCircleIcon width={18} height={18} {...p} />;
export const WarningIcon = (p: IconProps) => <SharedWarning width={18} height={18} {...p} />;
export const InfoIcon = (p: IconProps) => <SharedInfo width={18} height={18} {...p} />;
export const XIcon = (p: IconProps) => <SharedX width={14} height={14} {...p} />;

export const SpinnerIcon = (p: IconProps) => (
  <SharedSpinner width={18} height={18} {...p} className={cx("ts-spinner", p.className)} />
);
