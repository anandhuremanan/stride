import { SpinnerIcon as SharedSpinner, Svg, type IconProps } from "../../shared/react/icons";
import { cx } from "./props";

export { CheckIcon, ChevronDownIcon as ChevronIcon, SearchIcon, XIcon } from "../../shared/react/icons";

export const PlusIcon = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;

/** The class is what spins it; the arc itself is shared. */
export const SpinnerIcon = (p: IconProps) => (
  <SharedSpinner {...p} className={cx("cb-spinner", p.className)} />
);
