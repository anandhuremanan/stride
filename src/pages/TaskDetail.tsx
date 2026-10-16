import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { Alert } from "component-lib/alert";
import { Avatar } from "component-lib/avatar";
import { Badge } from "component-lib/badge";
import { Button } from "component-lib/button";
import { Card, CardBody, CardHeader } from "component-lib/card";
import { Checkbox } from "component-lib/checkbox";
import { Select } from "component-lib/combobox";
import { DatePicker } from "component-lib/date-picker";
import { Input } from "component-lib/input";
import { Empty } from "component-lib/skeleton";
import { Textarea } from "component-lib/textarea";
import { toast } from "component-lib/toaster";
import { ApiError } from "../api/client";
import { useUserLookup } from "../api/lookups";
import {
  addComment,
  updateTask,
  useActivity,
  useComments,
  useProjects,
  useProjectTasks,
  useSprints,
  useTask,
  useUsers,
} from "../api/queries";
import { useAuth } from "../auth/context";
import { AppShell } from "../components/AppShell";
import { ProjectLayout } from "../components/ProjectLayout";
import { routerLink } from "../components/routerLink";
import { Panel, PriorityBadge, QueryState, StatusBadge } from "../components/ui";
import { firstName, formatRange, formatRelative, formatStamp, plural, toIsoDay } from "../lib/format";
import { ROLE_LABEL } from "../shared/rbac";
import { ESTIMATES, PRIORITIES, STATUSES, type Project, type Task } from "../shared/types";

const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }));
const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: p }));
const ESTIMATE_OPTIONS = ESTIMATES.map((n) => ({ value: n, label: `${n} points` }));

export function TaskDetail() {
  const { id } = useParams();
  const task = useTask(id);
  const projects = useProjects();
  const project = projects.data?.find((p) => p.id === task.data?.projectId);

  if (task.error instanceof ApiError && task.error.status === 404) {
    return (
      <AppShell breadcrumbs={[{ label: "Not found" }]}>
        <Empty title={`There’s no task ${id}`} description="It may have been moved to another project."
          actions={<Button render={routerLink("/my-tasks")}>My tasks</Button>} />
      </AppShell>
    );
  }

  if (!task.data || !project) {
    return (
      <AppShell breadcrumbs={[{ label: id ?? "Task" }]}>
        <QueryState loading={!task.error && !projects.error} error={task.error ?? projects.error}>
          {() => null}
        </QueryState>
      </AppShell>
    );
  }

  return (
    <ProjectLayout tab="board" slug={project.slug} crumb={task.data.id}>
      {() => <TaskWorkspace task={task.data!} project={project} />}
    </ProjectLayout>
  );
}

function TaskWorkspace({ task, project }: { task: Task; project: Project }) {
  const { can, user, workspace } = useAuth();
  const sprints = useSprints(project.slug);
  const projectTasks = useProjectTasks(project.slug);
  const users = useUsers();
  const comments = useComments(task.id);
  const history = useActivity({ task: task.id, limit: 10 });
  const person = useUserLookup();
  const [saving, setSaving] = useState(0);
  const [draft, setDraft] = useState("");
  const [criterion, setCriterion] = useState("");
  const canEdit = can("task:edit");
  const boardPath = `/projects/${project.slug}/board`;

  const sprint = sprints.data?.find((s) => s.id === task.sprintId);
  const upNext = projectTasks.data?.find(
    (t) => t.sprintId === task.sprintId && t.status === "To do" && t.id !== task.id && task.sprintId,
  );
  const inReview = projectTasks.data?.filter((t) => t.sprintId === task.sprintId && t.status === "In review").length ?? 0;
  const doneCount = task.checklist.filter((c) => c.done).length;

  const save = async (patch: Parameters<typeof updateTask>[1]) => {
    setSaving((n) => n + 1);
    try {
      await updateTask(task.id, patch);
    } catch (e) {
      toast.error("Couldn’t save that change", { description: (e as Error).message });
    } finally {
      setSaving((n) => n - 1);
    }
  };

  const postComment = async () => {
    try {
      await addComment(task.id, draft);
      setDraft("");
    } catch (e) {
      toast.error("Couldn’t post the comment", { description: (e as Error).message });
    }
  };

  const sprintOptions = (sprints.data ?? [])
    .filter((s) => s.status !== "completed" || s.id === task.sprintId)
    .map((s) => ({ value: s.id, label: s.name }));

  return (
    <>
      <div className="return-row">
        <Link to={boardPath} className="section-link return-link">
          <ArrowLeft size={16} aria-hidden />
          Back to {sprint?.status === "active" ? `${sprint.name} board` : "the board"}
        </Link>
        <span className="row-meta" role="status">
          {saving > 0 ? "Saving…" : "All changes saved"}
        </span>
      </div>

      {!canEdit && (
        <Alert variant="neutral" size="sm" title={`You’re viewing as ${ROLE_LABEL[user.role]}. Ask an admin if you need to make changes.`} />
      )}

      <div className="task-workspace">
        <aside className="board-context" aria-label="Sprint context">
          {sprint ? (
            <>
              <div>
                <p className="context-title">{sprint.name}</p>
                <p className="row-meta">{formatRange(sprint.start, sprint.end)}</p>
              </div>
              {inReview > 0 && (
                <span>
                  <Badge variant="warning">In review · {inReview}</Badge>
                </span>
              )}
            </>
          ) : (
            <p className="context-title">Product backlog</p>
          )}
          <MiniCard task={task} assignee={person(task.assigneeId)?.name} current />
          {upNext && (
            <>
              <p className="context-title">Up next</p>
              <MiniCard task={upNext} assignee={person(upNext.assigneeId)?.name} />
              {upNext.description && <p className="row-meta">{upNext.description}</p>}
            </>
          )}
        </aside>

        <div className="task-main">
          <Card padding="lg" className="task-header">
            <CardHeader
              title={<h2 className="task-title">{task.title}</h2>}
              description={`${task.id} · ${task.type} · Created by ${person(task.createdBy)?.name ?? "someone"}`}
              actions={
                <Button variant="ghost" size="sm" icon={<X size={16} />} aria-label="Close task" render={routerLink(boardPath)} />
              }
            />
            <CardBody>
              {task.description && <p className="body-text">{task.description}</p>}
              <div className="badge-row">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <Badge>{task.points} pts</Badge>
              </div>
            </CardBody>
          </Card>

          <Panel title="Acceptance checklist" context={`${doneCount} of ${task.checklist.length} complete`}>
            {task.checklist.length === 0 && <p className="empty-note">No acceptance criteria yet.</p>}
            {task.checklist.length > 0 && (
              <ul className="checklist">
                {task.checklist.map((item) => (
                  <li key={item.id} className="checklist-item">
                    <Checkbox label={item.label} checked={item.done} disabled={!canEdit}
                      onCheckedChange={(done) => void save({ checklist: [{ id: item.id, done }] })} />
                    {canEdit && (
                      <Button variant="ghost" size="sm" icon={<X size={14} />} aria-label={`Remove “${item.label}”`}
                        className="checklist-remove" onClick={() => void save({ checklist: [{ id: item.id, remove: true }] })} />
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (
              <form
                className="checklist-add"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!criterion.trim()) return;
                  void save({ checklist: [{ label: criterion }] }).then(() => setCriterion(""));
                }}
              >
                <Input aria-label="New acceptance criterion" placeholder="Add a criterion" value={criterion}
                  onValueChange={setCriterion} maxLength={160} />
                <Button type="submit" variant="outline" disabled={!criterion.trim()}>
                  Add
                </Button>
              </form>
            )}
          </Panel>

          <Panel title="Discussion" context={plural(comments.data?.length ?? 0, "comment")}>
            <ul className="comments">
              {(comments.data ?? []).map((c) => {
                const author = person(c.authorId)?.name ?? "Someone";
                return (
                  <li key={c.id} className="comment">
                    <Avatar name={author} size="sm" />
                    <div className="comment-detail">
                      <div className="comment-author">
                        <span className="row-title">{author}</span>
                        <span className="row-meta">{formatStamp(c.createdAt, workspace.now)}</span>
                      </div>
                      <p className="comment-body">{c.body}</p>
                      {c.link && (
                        <a href="#preview" className="section-link comment-link">
                          {c.link} ↗
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {can("task:comment") ? (
              <>
                <Textarea label="Add a comment" placeholder="Share an update or mention a teammate…" value={draft}
                  onValueChange={setDraft} rows={3} maxLength={2000} />
                <div className="comment-actions">
                  <Button disabled={!draft.trim()} onClick={postComment} loadingText="Posting…">
                    Post comment
                  </Button>
                </div>
              </>
            ) : (
              <p className="row-meta">Viewers can read the discussion but not post.</p>
            )}
          </Panel>
        </div>

        <aside className="task-side" aria-label="Task details">
          <Panel title="Details">
            <div className="stack">
              <Select label="Status" options={STATUS_OPTIONS} value={task.status} clearable={false} searchable={false}
                disabled={!canEdit} onChange={(v) => v && void save({ status: v })} />
              <Select label="Assignee"
                options={(users.data ?? []).filter((u) => u.status === "active").map((u) => ({ value: u.id, label: u.name }))}
                value={task.assigneeId} clearable={false} disabled={!canEdit}
                onChange={(v) => v && void save({ assigneeId: v })} />
              <Select label="Priority" options={PRIORITY_OPTIONS} value={task.priority} clearable={false}
                searchable={false} disabled={!canEdit} onChange={(v) => v && void save({ priority: v })} />
              <Select label="Sprint" placeholder="Backlog" options={sprintOptions} value={task.sprintId}
                searchable={false} disabled={!can("sprint:manage")}
                description={can("sprint:manage") || !canEdit ? undefined : "Only admins move work between sprints."}
                onChange={(v) => void save({ sprintId: v })} />
              <Select label="Estimate" options={ESTIMATE_OPTIONS} value={task.points} clearable={false}
                searchable={false} disabled={!canEdit} onChange={(v) => v && void save({ points: v })} />
              <DatePicker label="Due date" value={task.due} readOnly={!canEdit}
                onChange={(d) => void save({ due: d ? toIsoDay(d) : null })} />
            </div>
          </Panel>
          <Panel title="Activity">
            <ul className="activity-log">
              {(history.data ?? []).map((a) => (
                <li key={a.id}>
                  {firstName(person(a.actorId)?.name ?? "Someone")} {a.text}.{" "}
                  <span className="row-meta">{formatRelative(a.createdAt, workspace.now)}</span>
                </li>
              ))}
              {history.data?.length === 0 && <li className="row-meta">No activity yet.</li>}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function MiniCard({ task, assignee, current = false }: { task: Task; assignee: string | undefined; current?: boolean }) {
  return (
    <Card padding="sm" className={current ? "task-card is-current" : "task-card"}>
      <CardHeader
        title={
          <h3 className="task-card-title">
            {current ? (
              task.title
            ) : (
              <Link to={`/tasks/${task.id}`} className="card-link">
                {task.title}
              </Link>
            )}
          </h3>
        }
        description={`${task.id} · ${task.type}`}
      />
      <CardBody>
        <div className="task-card-meta">
          <PriorityBadge priority={task.priority} />
          <span className="row-meta">{task.points} pts</span>
          <Avatar name={assignee ?? "?"} size="sm" className="task-card-avatar" />
        </div>
      </CardBody>
    </Card>
  );
}
