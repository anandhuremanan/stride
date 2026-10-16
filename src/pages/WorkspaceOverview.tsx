import { Link } from "react-router-dom";
import { ArrowUpRight, Circle, MessageSquare } from "lucide-react";
import { Avatar } from "component-lib/avatar";
import { Badge } from "component-lib/badge";
import { Button } from "component-lib/button";
import { Card, CardBody, Stat } from "component-lib/card";
import { useUserLookup } from "../api/lookups";
import { useActivity, useMyTasks, useProjects, useSprints, useUsers } from "../api/queries";
import { useAuth } from "../auth/context";
import { AppShell } from "../components/AppShell";
import { routerLink } from "../components/routerLink";
import { PageHeading, Panel, PersonName, QueryState, SprintBanner } from "../components/ui";
import { firstName, formatDate, formatDay, formatDue, formatRelative, plural } from "../lib/format";
import type { Project, Task } from "../shared/types";

function greeting(nowIso: string) {
  const hour = new Date(nowIso).getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function WorkspaceOverview() {
  const { user, workspace, can } = useAuth();
  const projects = useProjects();
  const myTasks = useMyTasks();
  const activity = useActivity({ limit: 3 });
  const person = useUserLookup();

  const list = projects.data ?? [];
  const active = list.filter((p) => p.status === "Active");
  // The project to feature: one this person owns, else the first active one.
  const featured = active.find((p) => p.ownerId === user.id) ?? active[0];
  const sprints = useSprints(featured?.slug);
  const sprint = sprints.data?.find((s) => s.status === "active");
  const sprintName = (id: string | null) => sprints.data?.find((s) => s.id === id)?.name ?? "Unscheduled";
  const projectOf = (id: string) => list.find((p) => p.id === id);

  const owned = new Set(list.filter((p) => p.ownerId === user.id).map((p) => p.id));
  const tasks = myTasks.data ?? [];
  const toReview = tasks.filter((t) => t.status === "In review" && owned.has(t.projectId) && t.assigneeId !== user.id);
  const open = tasks.filter((t) => t.status !== "Done");
  const nextSteps = [...open].sort(byUrgency(toReview)).slice(0, 4);
  const milestone = active
    .filter((p) => p.milestoneDate >= workspace.today)
    .sort((a, b) => a.milestoneDate.localeCompare(b.milestoneDate))[0];

  const metrics = [
    {
      label: "Active projects",
      value: String(active.length),
      help: `${plural(list.length - active.length, "more project")} in planning`,
    },
    sprint
      ? {
          label: `${sprint.name} progress`,
          value: `${sprint.stats.doneTasks} / ${sprint.stats.tasks}`,
          help: `Tasks done · ${featured!.name}`,
        }
      : { label: "Sprint progress", value: "—", help: "No sprint is running" },
    {
      label: "Ready for review",
      value: plural(toReview.length, "task"),
      help: toReview[0] ? `${toReview[0].title} needs your eyes` : "Nothing is waiting on you",
    },
    milestone
      ? { label: "Next milestone", value: formatDay(milestone.milestoneDate), help: milestone.milestone }
      : { label: "Next milestone", value: "—", help: "No milestones ahead" },
  ];

  return (
    <AppShell breadcrumbs={[{ label: "Overview" }]}>
      <PageHeading
        title={`${greeting(workspace.now)}, ${firstName(user.name)}`}
        description={`Here’s what’s moving across ${workspace.name} today.`}
        actions={can("project:create") ? <Button render={routerLink("/projects?new=1")}>Create project</Button> : undefined}
      />

      <QueryState loading={projects.loading || myTasks.loading} error={projects.error ?? myTasks.error}>
        {() =>
          list.length === 0 ? (
            <GettingStarted />
          ) : (
          <>
            <section className="metric-row" aria-label="Workspace summary">
              {metrics.map((m) => (
                <Card key={m.label} padding="lg">
                  <CardBody>
                    <Stat label={m.label} value={m.value} help={m.help} />
                  </CardBody>
                </Card>
              ))}
            </section>

            {sprint && featured && (
              <section className="sprint" aria-labelledby="sprint-heading">
                <div className="section-heading">
                  <h2 id="sprint-heading" className="section-title">Keep the sprint moving</h2>
                  <Link to={`/projects/${featured.slug}/board`} className="section-link">
                    {featured.name} → Board
                  </Link>
                </div>
                <SprintBanner sprint={sprint} />
              </section>
            )}

            <div className="overview-columns">
              <Panel title="Your next steps" context={user.name}>
                {nextSteps.length === 0 ? (
                  <p className="empty-note">You’re all caught up.</p>
                ) : (
                  <ul className="row-list">
                    {nextSteps.map((task) => {
                      const review = toReview.includes(task);
                      const Icon = review ? MessageSquare : Circle;
                      const due = formatDue(task.due, workspace.today, "No due date");
                      return (
                        <li key={task.id}>
                          <Link to={`/tasks/${task.id}`} className="task-row">
                            <Icon size={17} strokeWidth={1.75} className="row-icon" aria-hidden />
                            <span className="row-text">
                              <span className="row-title">{review ? `Review: ${task.title}` : task.title}</span>
                              <span className="row-meta">
                                {task.id} · {projectOf(task.projectId)?.name} ·{" "}
                                {review
                                  ? `Review requested by ${firstName(person(task.assigneeId)?.name ?? "the team")}`
                                  : sprintName(task.sprintId)}
                              </span>
                            </span>
                            <Badge variant={due === "Today" ? "warning" : "neutral"}>{due}</Badge>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="list-footer">
                  <span className="row-meta">{plural(open.filter((t) => t.assigneeId === user.id).length, "open task")} assigned to you</span>
                  <Button variant="outline" render={routerLink("/my-tasks")}>
                    View my tasks
                  </Button>
                </div>
              </Panel>

              <Panel title="Recent activity" context="Latest">
                <ul className="activity-feed">
                  {(activity.data ?? []).map((item) => {
                    const actor = person(item.actorId)?.name ?? "Someone";
                    return (
                      <li key={item.id} className="activity-item">
                        <Avatar name={actor} size="sm" />
                        <div className="row-text">
                          <span className="activity-title">
                            {firstName(actor)} {item.text}
                          </span>
                          <span className="row-meta">{item.detail}</span>
                          <span className="activity-time">{formatRelative(item.createdAt, workspace.now)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </div>

            <Panel title="Active projects" context={`${plural(active.length, "project")} in motion`}>
              <ul className="row-list">
                {active.map((project) => (
                  <ProjectRow key={project.id} project={project} owner={person(project.ownerId)?.name} />
                ))}
              </ul>
            </Panel>
          </>
          )
        }
      </QueryState>
    </AppShell>
  );
}

/** A fresh workspace: what to do first, shaped by what this person's role allows. */
function GettingStarted() {
  const { can, workspace } = useAuth();
  const users = useUsers();
  const teamSize = users.data?.filter((u) => u.status === "active").length ?? 1;
  const steps = [
    {
      done: false,
      title: "Create your first project",
      text: "Give it a name and a short task prefix, like WEB for website work.",
      action: can("project:create") ? <Button render={routerLink("/projects?new=1")}>Create project</Button> : null,
    },
    {
      done: teamSize > 1,
      title: "Add your team",
      text: "Add people with the right role. Each gets a one-time password to sign in with.",
      action: can("members:invite") ? (
        <Button variant="outline" render={routerLink("/team?add=1")}>
          Add people
        </Button>
      ) : null,
    },
    {
      done: false,
      title: "Plan a sprint",
      text: "Write tasks into the backlog, then plan and start a sprint from the project’s Sprints tab.",
      action: null,
    },
  ];
  return (
    <Panel title={`Welcome to ${workspace.name}`} context="Getting started">
      {can("project:create") ? (
        <ol className="getting-started">
          {steps.map((step, i) => (
            <li key={step.title} className={step.done ? "step is-done" : "step"}>
              <span className="step-number" aria-hidden>
                {step.done ? "✓" : i + 1}
              </span>
              <div className="row-text step-text">
                <span className="row-title">{step.title}</span>
                <span className="muted">{step.text}</span>
              </div>
              {step.action}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">
          There are no projects yet. Once an admin creates one, your work will show up here.
        </p>
      )}
    </Panel>
  );
}

/** Reviews first, then by due date, undated last. */
function byUrgency(reviews: Task[]) {
  return (a: Task, b: Task) => {
    const ra = reviews.includes(a) ? 0 : 1;
    const rb = reviews.includes(b) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (a.due ?? "9999").localeCompare(b.due ?? "9999");
  };
}

function ProjectRow({ project, owner }: { project: Project; owner: string | undefined }) {
  return (
    <li>
      <Link to={`/projects/${project.slug}`} className="project-row">
        <span className="project-mark" aria-hidden>
          {project.key}
        </span>
        <span className="row-text project-name">
          <span className="row-title">{project.name}</span>
          <span className="row-meta">
            {project.tasksDone} of {project.tasksTotal} tasks complete
          </span>
        </span>
        <span className="project-owner">
          <PersonName name={owner} />
        </span>
        <span className="row-text project-milestone">
          <span>{project.milestone}</span>
          <span className="row-meta">{formatDate(project.milestoneDate)}</span>
        </span>
        <Badge variant="accent">{project.status}</Badge>
        <ArrowUpRight size={17} strokeWidth={1.75} className="row-icon" aria-hidden />
      </Link>
    </li>
  );
}
