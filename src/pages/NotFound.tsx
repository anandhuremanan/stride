import { Button } from "component-lib/button";
import { Empty } from "component-lib/skeleton";
import { AppShell } from "../components/AppShell";
import { routerLink } from "../components/routerLink";

export function NotFound() {
  return (
    <AppShell breadcrumbs={[{ label: "Not found" }]}>
      <Empty
        title="We couldn’t find that page"
        description="It may have moved, or the link may be out of date."
        actions={<Button render={routerLink("/")}>Back to overview</Button>}
      />
    </AppShell>
  );
}
