import type { AnchorHTMLAttributes } from "react";
import { Link } from "react-router-dom";

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string };

/**
 * Draws a kit link through React Router, e.g. `render={routerLink("/my-tasks")}`
 * on a Button, or `renderLink={routerLink()}` on a Breadcrumb (which supplies
 * its own href).
 */
export function routerLink(to?: string) {
  return function RouterLink({ href, ...props }: AnchorProps) {
    return <Link to={to ?? href ?? "/"} {...props} />;
  };
}
