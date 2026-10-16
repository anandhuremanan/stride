import { Svg, type IconProps } from "../../shared/react/icons";

export {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
} from "../../shared/react/icons";

export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></Svg>
);
export const MoreIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5h.01M12 12h.01M12 19h.01" strokeWidth="3" /></Svg>
);
export const ChevronsLeftIcon = (p: IconProps) => (
  <Svg {...p}><path d="m11 17-5-5 5-5M18 17l-5-5 5-5" /></Svg>
);
export const ChevronsRightIcon = (p: IconProps) => (
  <Svg {...p}><path d="m13 17 5-5-5-5M6 17l5-5-5-5" /></Svg>
);
export const ColumnsIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></Svg>
);
export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></Svg>
);
export const DensityIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>
);
export const PinIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 17v5M9 3h6l-1 6 3 4H7l3-4z" /></Svg>
);
export const EyeOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
  </Svg>
);
export const MoveIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14M9 8l-4 4 4 4M15 8l4 4-4 4" /></Svg>
);
