import { useState } from "react";
import { Avatar } from "component-lib/avatar";
import { Badge } from "component-lib/badge";
import { Button } from "component-lib/button";
import { DateRangePicker } from "component-lib/date-picker";
import { Modal } from "component-lib/modal";
import { Empty } from "component-lib/skeleton";
import { Textarea } from "component-lib/textarea";
import { toast } from "component-lib/toaster";
import { useUserLookup } from "../api/lookups";
import { completeSprint, createSprint, startSprint, updateSprint, useProjectTasks, useSprints } from "../api/queries";
import { useAuth } from "../auth/context";
import { ProjectLayout } from "../components/ProjectLayout";
import { routerLink } from "../components/routerLink";
import { Panel, QueryState, SprintBanner } from "../components/ui";
import { formatDay, formatDue, formatRange, plural, toIsoDay } from "../lib/format";
import { STATUSES, type Project, type Sprint, type Task } from "../shared/types";

export function Sprints() {
  const { can } = useAuth();
  return (
    <ProjectLayout tab="sprints" actions={(project) => (can("sprint:manage") ? <CreateSprintButton slug={project.slug} /> : null)}>
      {(project) => <SprintsBody project={project} />}
    </ProjectLayout>
  );
}

function CreateSprintButton({ slug }: { slug: string }) {
  const sprints = useSprints(slug);
  const hasPlanned = sprints.data?.some((s) => s.status === "planned");
  return (
    <Button
      disabled={hasPlanned}
      title={hasPlanned ? "Plan the upcoming sprint first" : undefined}
      onClick={async () => {
        try {
          const sprint = await createSprint(slug);
          toast.success(`${sprint.name} created`, { description: formatRange(sprint.start, sprint.end) });
        } catch (e) {
          toast.error("Couldn’t create the sprint", { description: (e as Error).message });
        }
      }}
    >
      Create sprint
    </Button>
  );
}

function SprintsBody({ project }: { project: Project }) {
  const { can } = useAuth();
  const sprints = useSprints(project.slug);
  const tasks = useProjectTasks(project.slug);

  return (
    <QueryState loading={sprints.loading || tasks.loading} error={sprints.error ?? tasks.error}>
      {() => {
        const all = sprints.data!;
        const active = all.find((s) => s.status === "active");
        const planned = all.find((s) => s.status === "planned");
        const completed = all.filter((s) => s.status === "completed").reverse();
        const inSprint = (s: Sprint) => tasks.data!.filter((t) => t.sprintId === s.id);
        return (
          <>
            {active && <SprintBanner sprint={active} />}
            <div className="sprint-planning">
              <div className="stack">
                {active ? (
                  <ActiveSprint sprint={active} slug={project.slug} items={inSprint(active)} next={planned} />
                ) : (
                  <Panel title="No sprint running">
                    <p className="muted">Start one from the upcoming sprint when the team is ready.</p>
                  </Panel>
                )}
              </div>
              {planned ? (
                <NextSprint sprint={planned} slug={project.slug} items={inSprint(planned)} canStart={!active} />
              ) : (
                <Panel title="Upcoming sprint" className="next-sprint">
                  <Empty
                    size="sm"
                    title="Nothing planned yet"
                    description={
                      all.length === 0
                        ? "Sprints are short blocks of work. Create one, fill it from the backlog, then start it."
                        : "Create the next sprint to start planning."
                    }
                    actions={can("sprint:manage") ? <CreateSprintButton slug={project.slug} /> : undefined}
                  />
                </Panel>
              )}
            </div>

            <Panel title="Completed sprints" context="Delivery history">
              {completed.length === 0 ? (
                <p className="empty-note">No sprints have finished yet.</p>
              ) : (
                <ul className="history">
                  {completed.map((s) => (
                    <li key={s.id} className="history-tile">
                      <div className="history-head">
                        <span className="row-title">{s.name}</span>
                        <Badge variant="success">Completed</Badge>
                      </div>
                      <span className="row-meta">{formatRange(s.start, s.end)}</span>
                      <span className="history-points">
                        {s.stats.donePoints} / {s.stats.points} pts
                      </span>
                      <span className="row-meta">
                        {s.stats.doneTasks} of {s.stats.tasks} tasks done
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        );
      }}
    </QueryState>
  );
}

function ActiveSprint({ sprint, slug, items, next }: { sprint: Sprint; slug: string; items: Task[]; next?: Sprint }) {
  const { workspace, can } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const unfinished = items.filter((t) => t.status !== "Done").length;
  const person = useUserLookup();
  const people = new Set(items.map((t) => t.assigneeId)).size;
  const reviews = items.filter((t) => t.status === "In review");

  return (
    <>
      <Panel title={`${sprint.name} · In motion`} context={`${plural(sprint.stats.tasks, "task")} · ${sprint.stats.points} points`}>
        <p className="body-text">{sprint.goal || "No goal set."}</p>
        <ul className="status-tiles">
          {STATUSES.map((status) => (
            <li key={status} className="status-tile">
              <span className="row-meta">{status}</span>
              <span className="tile-count">{sprint.stats.byStatus[status].tasks}</span>
              <span className="row-meta">{sprint.stats.byStatus[status].points} pts</span>
            </li>
          ))}
        </ul>
        <div className="panel-actions">
          <span className="row-meta">
            Scope {sprint.stats.points} / {sprint.capacity} pts capacity · {plural(people, "person", "people")}
          </span>
          <div className="button-row">
            {can("sprint:manage") && (
              <Button variant="outline" onClick={() => setConfirming(true)}>
                Complete sprint
              </Button>
            )}
            <Button variant="outline" render={routerLink(`/projects/${slug}/board`)}>
              Open board
            </Button>
          </div>
        </div>
      </Panel>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        size="sm"
        title={`Complete ${sprint.name}?`}
        footer={({ close }) => (
          <div className="button-row modal-actions">
            <Button variant="outline" onClick={close}>
              Keep going
            </Button>
            <Button
              loadingText="Completing…"
              onClick={async () => {
                try {
                  await completeSprint(sprint.id);
                  toast.success(`${sprint.name} completed`, { description: `${sprint.stats.donePoints} of ${sprint.stats.points} points delivered` });
                  close();
                } catch (e) {
                  toast.error("Couldn’t complete the sprint", { description: (e as Error).message });
                }
              }}
            >
              Complete sprint
            </Button>
          </div>
        )}
      >
        <p className="body-text">
          {sprint.stats.doneTasks} of {sprint.stats.tasks} tasks are done ({sprint.stats.donePoints} of {sprint.stats.points} points).
          {unfinished > 0 && ` ${plural(unfinished, "unfinished task")} will move to ${next ? next.name : "the backlog"}.`}
        </p>
      </Modal>

      <Panel title="Needs a decision" context={plural(reviews.length, "review") + " pending"}>
        {reviews.length === 0 ? (
          <p className="empty-note">Nothing is waiting for review.</p>
        ) : (
          <ul className="row-list">
            {reviews.map((task) => {
              const assignee = person(task.assigneeId)?.name ?? "Unassigned";
              return (
                <li key={task.id} className="decision">
                  <Avatar name={assignee} size="sm" />
                  <div className="row-text decision-text">
                    <span className="row-title">{task.title}</span>
                    <span className="row-meta">
                      {task.id} · {assignee} · {task.points} pts
                      {task.due && ` · Due ${formatDue(task.due, workspace.today).toLowerCase()}`}
                    </span>
                  </div>
                  <Button variant="outline" render={routerLink(`/tasks/${task.id}`)}>
                    Review task
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

function NextSprint({ sprint, slug, items, canStart }: { sprint: Sprint; slug: string; items: Task[]; canStart: boolean }) {
  const { can } = useAuth();
  const canPlan = can("sprint:manage");
  const [editingGoal, setEditingGoal] = useState(false);
  const planned = items.reduce((n, t) => n + t.points, 0);

  const saveDates = async (start: Date | null, end: Date | null) => {
    if (!start || !end) return;
    try {
      await updateSprint(sprint.id, { start: toIsoDay(start), end: toIsoDay(end) });
      toast.success(`${sprint.name} dates saved`);
    } catch (e) {
      toast.error("Couldn’t save the dates", { description: (e as Error).message });
    }
  };

  return (
    <Panel title={sprint.name} context="Upcoming" className="next-sprint">
      <div className="stack">
        <span>
          <Badge>Planning · not started</Badge>
        </span>
        <div className="field-block">
          <span className="field-label">Goal</span>
          <p className="body-text">{sprint.goal || "No goal yet."}</p>
        </div>
        <DateRangePicker
          label="Sprint dates"
          value={{ start: sprint.start, end: sprint.end }}
          readOnly={!canPlan}
          clearable={false}
          onChange={(range, complete) => complete && void saveDates(range.start, range.end)}
        />
        <div className="capacity-row">
          <span>Planned capacity</span>
          <strong>
            {planned} / {sprint.capacity} pts
          </strong>
        </div>
        {items.length === 0 ? (
          <p className="empty-note">No work planned yet. Move items in from the backlog.</p>
        ) : (
          <ul className="row-list">
            {items.map((t) => (
              <li key={t.id} className="planned-task">
                <div className="row-text">
                  <span className="planned-title">{t.title}</span>
                  <span className="row-meta">{t.id}</span>
                </div>
                <Badge>{t.points} pts</Badge>
              </li>
            ))}
          </ul>
        )}
        {canPlan && (
          <div className="button-row">
            {canStart && (
              <Button
                disabled={items.length === 0}
                title={items.length === 0 ? "Move work into the sprint first" : undefined}
                loadingText="Starting…"
                onClick={async () => {
                  try {
                    await startSprint(sprint.id);
                    toast.success(`${sprint.name} started`);
                  } catch (e) {
                    toast.error("Couldn’t start the sprint", { description: (e as Error).message });
                  }
                }}
              >
                Start sprint
              </Button>
            )}
            <Button variant={canStart ? "outline" : "primary"} render={routerLink(`/projects/${slug}/backlog`)}>
              Add work
            </Button>
            <Button variant="outline" onClick={() => setEditingGoal(true)}>
              Edit goal
            </Button>
          </div>
        )}
        <p className="row-meta">
          {canStart
            ? "Review scope with the team, then start the sprint."
            : `Review scope with the team before ${formatDay(sprint.start)}.`}
        </p>
      </div>

      <Modal open={editingGoal} onOpenChange={setEditingGoal} title={`${sprint.name} goal`} size="sm">
        {editingGoal && <GoalForm sprint={sprint} onDone={() => setEditingGoal(false)} />}
      </Modal>
    </Panel>
  );
}

function GoalForm({ sprint, onDone }: { sprint: Sprint; onDone: () => void }) {
  const [goal, setGoal] = useState(sprint.goal);
  const save = async () => {
    try {
      await updateSprint(sprint.id, { goal });
      toast.success("Goal saved");
      onDone();
    } catch (e) {
      toast.error("Couldn’t save the goal", { description: (e as Error).message });
    }
  };
  return (
    <form className="stack form-stack" onSubmit={(e) => e.preventDefault()}>
      <Textarea label="Goal" description="One sentence the whole team can repeat." value={goal} onValueChange={setGoal}
        rows={3} maxLength={200} showCount autoFocus />
      <div className="button-row modal-actions">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" onClick={save} disabled={!goal.trim()} loadingText="Saving…">
          Save goal
        </Button>
      </div>
    </form>
  );
}
