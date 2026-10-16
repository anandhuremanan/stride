import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "component-lib/button";
import { Empty } from "component-lib/skeleton";
import { Tab, TabList, TabPanel, Tabs } from "component-lib/tabs";
import { ApiError } from "../api/client";
import { useProject } from "../api/queries";
import type { Project } from "../shared/types";
import { AppShell } from "./AppShell";
import { routerLink } from "./routerLink";
import { PageHeading, QueryState } from "./ui";

export type ProjectTab = "backlog" | "sprints" | "board" | "reports";

const TABS: { value: ProjectTab; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "sprints", label: "Sprints" },
  { value: "board", label: "Board" },
  { value: "reports", label: "Reports" },
];

interface ProjectLayoutProps {
  tab: ProjectTab;
  /** Override the slug from the URL, e.g. on a task page. */
  slug?: string;
  actions?: (project: Project) => ReactNode;
  /** Extra crumb after the tab, e.g. a task id. */
  crumb?: string;
  children: (project: Project) => ReactNode;
}

export function ProjectLayout({ tab, slug: slugProp, actions, crumb, children }: ProjectLayoutProps) {
  const params = useParams();
  const slug = slugProp ?? params.slug;
  const navigate = useNavigate();
  const { data: project, error, loading } = useProject(slug);
  const base = `/projects/${slug}`;
  const tabLabel = TABS.find((t) => t.value === tab)!.label;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <AppShell breadcrumbs={[{ label: "Not found" }]}>
        <Empty
          title="That project doesn’t exist"
          description="It may have been renamed, or the link is out of date."
          actions={<Button render={routerLink("/projects")}>All projects</Button>}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: project?.name ?? "Project", href: `${base}/backlog` },
        crumb ? { label: tabLabel, href: `${base}/${tab}` } : { label: tabLabel },
        ...(crumb ? [{ label: crumb }] : []),
      ]}
    >
      <QueryState loading={loading} error={error} lines={3}>
        {() => (
          <>
            <PageHeading title={project!.name} description={project!.description} actions={actions?.(project!)} />
            <Tabs value={tab} onValueChange={(next) => navigate(`${base}/${next}`)} className="project-tabs">
              <TabList aria-label={`${project!.name} views`}>
                {TABS.map((t) => (
                  <Tab key={t.value} value={t.value}>
                    {t.label}
                  </Tab>
                ))}
              </TabList>
              <TabPanel value={tab} className="project-panel">
                {children(project!)}
              </TabPanel>
            </Tabs>
          </>
        )}
      </QueryState>
    </AppShell>
  );
}
