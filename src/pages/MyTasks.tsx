import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search, Sun } from "lucide-react";
import { Button } from "component-lib/button";
import { Checkbox } from "component-lib/checkbox";
import { Select } from "component-lib/combobox";
import { Input } from "component-lib/input";
import { toast } from "component-lib/toaster";
import { useUserLookup } from "../api/lookups";
import { updateTask, useAllSprints, useMyTasks, useProjects } from "../api/queries";
import { useAuth } from "../auth/context";
import { AppShell } from "../components/AppShell";
import { TaskFormModal } from "../components/TaskFormModal";
import { PageHeading, Panel, PriorityBadge, QueryState, StatusBadge } from "../components/ui";
import { firstName, formatDue, plural } from "../lib/format";
import { PRIORITIES, type Task } from "../shared/types";

const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: p }));

type Group = "review" | "upcoming" | "unscheduled" | "done";

export function MyTasks() {
  const { user, workspace, can } = useAuth();
  const myTasks = useMyTasks();
  const projects = useProjects();
  const sprints = useAllSprints();
  const person = useUserLookup();
  const [query, setQuery] = useState("");
  const [project, setProject] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const owned = new Set((projects.data ?? []).filter((p) => p.ownerId === user.id).map((p) => p.id));
  const groupOf = (t: Task): Group => {
    if (t.status === "In review" && t.assigneeId !== user.id && owned.has(t.projectId)) return "review";
    if (t.status === "Done") return "done";
    if (!t.sprintId) return "unscheduled";
    return "upcoming";
  };

  const q = query.trim().toLowerCase();
  const all = myTasks.data ?? [];
  const visible = all.filter(
    (t) =>
      (!q || `${t.id} ${t.title}`.toLowerCase().includes(q)) &&
      (!project || t.projectId === project) &&
      (!priority || t.priority === priority),
  );
  const group = (g: Group) =>
    visible.filter((t) => groupOf(t) === g).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const review = group("review");
  const upcoming = group("upcoming");
  const done = group("done");

  const assignedOpen = all.filter((t) => t.assigneeId === user.id && t.status !== "Done").length;
  const nextUp = all.filter((t) => groupOf(t) === "upcoming")[0];
  const sprintName = (id: string | null) => sprints.data?.find((s) => s.id === id)?.name ?? "Unscheduled";
  const projectName = (id: string) => projects.data?.find((p) => p.id === id)?.name ?? "";

  const toggle = async (task: Task, checked: boolean) => {
    setPending(task.id);
    try {
      await updateTask(task.id, { status: checked ? "Done" : "To do" });
    } catch (e) {
      toast.error("Couldn’t update the task", { description: (e as Error).message });
    } finally {
      setPending(null);
    }
  };

  const rowProps = {
    today: workspace.today,
    canEdit: can("task:edit"),
    pending,
    onToggle: toggle,
    sprintName,
    projectName,
  };

  return (
    <AppShell breadcrumbs={[{ label: "My tasks" }]}>
      <PageHeading
        title="My tasks"
        description="Your work, with the next step always in sight."
        actions={can("task:create") ? <Button onClick={() => setAdding(true)}>Add task</Button> : undefined}
      />

      <div className="filters">
        <Input aria-label="Search your tasks" placeholder="Search your tasks" leading={<Search size={15} aria-hidden />}
          value={query} onValueChange={setQuery} clearable className="filter-search" />
        <Select aria-label="Project" placeholder="All projects"
          options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))} value={project}
          onChange={setProject} searchable={false} className="filter-select" />
        <Select aria-label="Priority" placeholder="All priorities" options={PRIORITY_OPTIONS} value={priority}
          onChange={setPriority} searchable={false} className="filter-select" />
        <span className="filter-count">
          {assignedOpen} assigned · {review.length} review
        </span>
      </div>

      <QueryState loading={myTasks.loading || projects.loading} error={myTasks.error ?? projects.error}>
        {() => (
          <>
            <div className="focus-banner">
              <Sun size={22} strokeWidth={1.75} aria-hidden />
              <div>
                <p className="focus-title">
                  {review.length > 0 ? "A clear day to unblock the team" : "Nothing is waiting on you"}
                </p>
                <p>
                  {review[0] &&
                    `Review ${firstName(person(review[0].assigneeId)?.name ?? "the team")}’s ${review[0].title.toLowerCase()} ${formatDue(review[0].due, workspace.today, "soon").toLowerCase()}. `}
                  {nextUp
                    ? `Your next assigned task is planned for ${sprintName(nextUp.sprintId)}.`
                    : "You have no planned work coming up."}
                </p>
              </div>
            </div>

            <TaskGroup title="Awaiting your review" items={review} {...rowProps} />
            <TaskGroup title="Upcoming" items={upcoming} {...rowProps} />
            <TaskGroup
              title="Unscheduled"
              items={group("unscheduled")}
              hint="These tasks aren’t in a sprint yet. Plan them when the team is ready."
              {...rowProps}
            />
            <TaskGroup
              title="Completed"
              context={`${plural(done.length, "task")} · ${done.reduce((n, t) => n + t.points, 0)} points`}
              items={done}
              {...rowProps}
            />
          </>
        )}
      </QueryState>

      <TaskFormModal open={adding} onOpenChange={setAdding} />
    </AppShell>
  );
}

interface TaskGroupProps {
  title: string;
  context?: string;
  hint?: string;
  items: Task[];
  today: string;
  canEdit: boolean;
  pending: string | null;
  onToggle: (task: Task, checked: boolean) => void;
  sprintName: (id: string | null) => string;
  projectName: (id: string) => string;
}

function TaskGroup({ title, context, hint, items, today, canEdit, pending, onToggle, sprintName, projectName }: TaskGroupProps) {
  return (
    <Panel title={title} context={context ?? plural(items.length, "task")}>
      {items.length === 0 ? (
        <p className="empty-note">Nothing here right now.</p>
      ) : (
        <ul className="row-list">
          {items.map((task) => {
            const due = formatDue(task.due, today);
            return (
              <li key={task.id} className="personal-task">
                <Checkbox
                  aria-label={`Mark “${task.title}” done`}
                  checked={task.status === "Done"}
                  disabled={!canEdit || pending === task.id}
                  onCheckedChange={(checked) => onToggle(task, checked)}
                />
                <div className="row-text personal-task-text">
                  <Link to={`/tasks/${task.id}`} className="row-title row-title-link">
                    {task.title}
                  </Link>
                  <span className="row-meta">
                    {task.id} · {projectName(task.projectId)} · {sprintName(task.sprintId)}
                  </span>
                </div>
                <span className="col-priority">
                  <PriorityBadge priority={task.priority} />
                </span>
                <span className={due === "Today" ? "col-due is-today" : "col-due"}>{due}</span>
                <span className="col-status">
                  <StatusBadge status={task.status} />
                </span>
                <Link to={`/tasks/${task.id}`} className="row-arrow" aria-label={`Open ${task.id}`}>
                  <ArrowUpRight size={16} strokeWidth={1.75} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {hint && <p className="panel-hint">{hint}</p>}
    </Panel>
  );
}
