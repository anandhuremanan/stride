import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Circle, CircleCheck, CircleDashed, CircleDot, Search } from "lucide-react";
import { Avatar, AvatarGroup } from "component-lib/avatar";
import { Badge } from "component-lib/badge";
import { Button } from "component-lib/button";
import { Card, CardBody, CardHeader } from "component-lib/card";
import { Select } from "component-lib/combobox";
import { Input } from "component-lib/input";
import { Modal } from "component-lib/modal";
import { Empty } from "component-lib/skeleton";
import { toast } from "component-lib/toaster";
import { useUserLookup } from "../api/lookups";
import { updateTask, useProjectTasks, useSprints, useUsers } from "../api/queries";
import { useAuth } from "../auth/context";
import { ProjectLayout } from "../components/ProjectLayout";
import { routerLink } from "../components/routerLink";
import { TaskFormModal } from "../components/TaskFormModal";
import { PersonName, PriorityBadge, QueryState, SprintBanner } from "../components/ui";
import { formatDue, plural } from "../lib/format";
import { PRIORITIES, STATUSES, type Project, type Task, type TaskStatus } from "../shared/types";

const COLUMN_ICON: Record<TaskStatus, LucideIcon> = {
  "To do": Circle,
  "In progress": CircleDashed,
  "In review": CircleDot,
  Done: CircleCheck,
};
const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: p }));
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));

export function Board() {
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  return (
    <ProjectLayout
      tab="board"
      actions={() => (can("task:create") ? <Button onClick={() => setAdding(true)}>Add task</Button> : null)}
    >
      {(project) => <BoardBody project={project} adding={adding} setAdding={setAdding} />}
    </ProjectLayout>
  );
}

function BoardBody({ project, adding, setAdding }: { project: Project; adding: boolean; setAdding: (o: boolean) => void }) {
  const { can, workspace } = useAuth();
  const sprints = useSprints(project.slug);
  const tasks = useProjectTasks(project.slug);
  const users = useUsers();
  const person = useUserLookup();
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const sprint = sprints.data?.find((s) => s.status === "active");
  const sprintTasks = (tasks.data ?? []).filter((t) => sprint && t.sprintId === sprint.id);
  const team = [...new Set(sprintTasks.map((t) => t.assigneeId))].map((id) => person(id)?.name ?? "");
  const q = query.trim().toLowerCase();
  const visible = sprintTasks.filter(
    (t) =>
      (!q || `${t.id} ${t.title}`.toLowerCase().includes(q)) &&
      (!assignee || t.assigneeId === assignee) &&
      (!priority || t.priority === priority),
  );
  const filtered = Boolean(q || assignee || priority);
  const points = (list: Task[]) => list.reduce((n, t) => n + t.points, 0);
  const open = sprintTasks.find((t) => t.id === openId) ?? null;

  const setStatus = async (task: Task, status: TaskStatus | null) => {
    if (!status || status === task.status) return;
    try {
      await updateTask(task.id, { status });
      toast.success(`${task.id} moved to ${status}`);
    } catch (e) {
      toast.error("Couldn’t move the task", { description: (e as Error).message });
    }
  };

  return (
    <QueryState loading={sprints.loading || tasks.loading} error={sprints.error ?? tasks.error}>
      {() =>
        !sprint ? (
          <Empty
            title="No sprint is running"
            description="Plan the next sprint and start it to see its board here."
            actions={<Button render={routerLink(`/projects/${project.slug}/sprints`)}>Go to sprints</Button>}
          />
        ) : (
          <>
            <SprintBanner sprint={sprint} />

            <div className="filters board-toolbar">
              <Input aria-label="Search this sprint" placeholder="Search this sprint"
                leading={<Search size={15} aria-hidden />} value={query} onValueChange={setQuery} clearable
                className="filter-search filter-search-sm" />
              <Select aria-label="Assignee" placeholder="All assignees"
                options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))} value={assignee}
                onChange={setAssignee} searchable={false} className="filter-select" />
              <Select aria-label="Priority" placeholder="All priorities" options={PRIORITY_OPTIONS} value={priority}
                onChange={setPriority} searchable={false} className="filter-select" />
              {team.length > 0 && (
                <AvatarGroup label="Sprint team" size="sm" className="board-team">
                  {team.map((name) => (
                    <Avatar key={name} name={name} size="sm" />
                  ))}
                </AvatarGroup>
              )}
            </div>

            <div className="board">
              {STATUSES.map((status) => {
                const items = visible.filter((t) => t.status === status);
                const Icon = COLUMN_ICON[status];
                return (
                  <section key={status} className="board-column" aria-label={status}>
                    <div className="column-heading">
                      <span className="column-label">
                        <Icon size={15} strokeWidth={1.75} aria-hidden />
                        <h2 className="column-title">{status}</h2>
                        <Badge count={items.length} showZero />
                      </span>
                      <span className="row-meta">{points(items)} pts</span>
                    </div>
                    {items.map((task) => (
                      <Card key={task.id} interactive padding="sm" className="task-card">
                        <CardHeader
                          title={
                            <h3 className="task-card-title">
                              <Button variant="link" className="card-trigger" onClick={() => setOpenId(task.id)}>
                                {task.title}
                              </Button>
                            </h3>
                          }
                          description={`${task.id} · ${task.type}`}
                        />
                        <CardBody>
                          <div className="task-card-meta">
                            <PriorityBadge priority={task.priority} />
                            <span className="row-meta">{task.points} pts</span>
                            <Avatar name={person(task.assigneeId)?.name ?? "?"} size="sm" className="task-card-avatar" />
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                    {status === "To do" && can("task:create") && (
                      <Button variant="outline" size="sm" className="column-add" onClick={() => setAdding(true)}>
                        Add task
                      </Button>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="board-footer">
              <span className="row-meta">
                {plural(visible.length, "work item")} · {points(visible)} story points ·{" "}
                {filtered ? "Filters applied" : "No filters applied"}
              </span>
              <span className="row-meta">Move work forward one clear step at a time.</span>
            </div>

            <Modal
              open={open !== null}
              onOpenChange={(next) => !next && setOpenId(null)}
              placement="right"
              title={open?.title}
              description={open ? `${open.id} · ${open.type}` : undefined}
              footer={
                open && (
                  <Button render={routerLink(`/tasks/${open.id}`)} fullWidth>
                    Open full task
                  </Button>
                )
              }
            >
              {open && (
                <div className="stack">
                  <Select label="Status" options={STATUS_OPTIONS} value={open.status} clearable={false} searchable={false}
                    disabled={!can("task:edit")} onChange={(v) => void setStatus(open, v as TaskStatus | null)}
                    description={can("task:edit") ? undefined : "Your role can view tasks but not change them."} />
                  <dl className="property-list">
                    <dt>Priority</dt>
                    <dd>
                      <PriorityBadge priority={open.priority} />
                    </dd>
                    <dt>Assignee</dt>
                    <dd>
                      <PersonName name={person(open.assigneeId)?.name} />
                    </dd>
                    <dt>Estimate</dt>
                    <dd>{open.points} points</dd>
                    <dt>Due</dt>
                    <dd>{formatDue(open.due, workspace.today)}</dd>
                  </dl>
                </div>
              )}
            </Modal>

            <TaskFormModal open={adding} onOpenChange={setAdding} projectSlug={project.slug} sprintId={sprint.id} />
          </>
        )
      }
    </QueryState>
  );
}
