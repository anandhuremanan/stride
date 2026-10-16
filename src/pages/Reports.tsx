import { useState, type ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { Badge } from "component-lib/badge";
import { Button } from "component-lib/button";
import { Card, CardBody, Stat } from "component-lib/card";
import { Select } from "component-lib/combobox";
import { Progress } from "component-lib/progress";
import { Empty } from "component-lib/skeleton";
import { useProjectTasks, useReport, useSprints } from "../api/queries";
import { useAuth } from "../auth/context";
import { BarChart, BurndownChart } from "../components/charts";
import { ProjectLayout } from "../components/ProjectLayout";
import { routerLink } from "../components/routerLink";
import { Panel, QueryState } from "../components/ui";
import { dayOfMonth, formatDay, formatRange, plural } from "../lib/format";
import { STATUSES, type Project, type SprintReport, type Task } from "../shared/types";

export function Reports() {
  return <ProjectLayout tab="reports">{(project) => <ReportsBody project={project} />}</ProjectLayout>;
}

function ReportsBody({ project }: { project: Project }) {
  const sprints = useSprints(project.slug);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const report = useReport(project.slug, sprintId);
  const tasks = useProjectTasks(project.slug);

  const options = (sprints.data ?? [])
    .filter((s) => s.status !== "planned")
    .reverse()
    .map((s) => ({ value: s.id, label: `${s.name} · ${s.status === "active" ? "Active" : "Completed"}` }));

  if (sprints.data && options.length === 0) {
    return <Empty title="No sprint data yet" description="Reports appear once this project has run a sprint." />;
  }

  return (
    <QueryState loading={report.loading} error={report.error}>
      {() => (
        <ReportView
          report={report.data!}
          tasks={(tasks.data ?? []).filter((t) => t.sprintId === report.data!.sprint.id)}
          selector={
            <Select aria-label="Sprint" options={options} value={report.data!.sprint.id} onChange={setSprintId}
              clearable={false} searchable={false} className="filter-select-wide" />
          }
        />
      )}
    </QueryState>
  );
}

function ReportView({ report, tasks, selector }: { report: SprintReport; tasks: Task[]; selector: ReactNode }) {
  const { workspace } = useAuth();
  const { sprint, burndown, history } = report;
  const { stats } = sprint;
  const active = sprint.status === "active";
  const remaining = stats.points - stats.donePoints;
  const openTasks = stats.tasks - stats.doneTasks;
  const pct = stats.points ? Math.round((stats.donePoints / stats.points) * 100) : 0;

  const days = sprint.workingDays;
  const elapsed = Math.max(0, days.findIndex((d) => d === workspace.today));
  const ideal = days.length > 1 ? stats.points * (1 - elapsed / (days.length - 1)) : 0;
  const perDay = sprint.daysLeft ? remaining / sprint.daysLeft : remaining;
  const review = tasks.find((t) => t.status === "In review");
  const todoPoints = stats.byStatus["To do"].points;

  const metrics = [
    { label: "Completed points", value: `${stats.donePoints} / ${stats.points}`, help: `${pct}% of committed scope` },
    { label: "Remaining work", value: `${remaining} pts`, help: `${plural(openTasks, "task")} still in motion` },
    active
      ? { label: "Time remaining", value: plural(sprint.daysLeft, "day"), help: "Working days after today" }
      : { label: "Tasks delivered", value: `${stats.doneTasks} / ${stats.tasks}`, help: "Sprint complete" },
  ];

  return (
    <>
      <div className="report-context">
        <div>
          <h2 className="section-title">Sprint delivery</h2>
          <p className="row-meta">
            {formatRange(sprint.start, sprint.end)}
            {active && ` · Snapshot as of ${formatDay(workspace.today)}`}
          </p>
        </div>
        {selector}
      </div>

      <section className="metric-row metric-row-3" aria-label="Sprint metrics">
        {metrics.map((m) => (
          <Card key={m.label} padding="lg">
            <CardBody>
              <Stat label={m.label} value={m.value} help={m.help} />
            </CardBody>
          </Card>
        ))}
      </section>

      <div className="chart-row">
        <Panel title="Sprint burndown" context={sprint.name}>
          {burndown.length === 0 ? (
            <p className="empty-note">Daily snapshots weren’t kept for this sprint; only its totals are archived.</p>
          ) : (
            <>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-line" aria-hidden />
                  Remaining points
                </span>
                <span className="legend-item">
                  <span className="legend-line is-ideal" aria-hidden />
                  Ideal pace
                </span>
                {active && <Badge variant="accent">Today · {formatDay(workspace.today)}</Badge>}
              </div>
              <p className="row-meta">Story points remaining</p>
              <BurndownChart
                days={days.map(dayOfMonth)}
                actual={burndown.map((p) => ({ day: dayOfMonth(p.date), remaining: p.remaining }))}
                total={stats.points}
              />
              <p className="row-meta chart-caption">Working days</p>
            </>
          )}
        </Panel>

        <Panel title="Recent delivery" context="Points">
          {history.length === 0 ? (
            <p className="empty-note">No completed sprints yet.</p>
          ) : (
            <>
              <p className="row-meta">Completed story points</p>
              <BarChart
                bars={history.map((h) => ({ label: h.name, value: h.delivered }))}
                max={Math.max(10, Math.ceil(Math.max(...history.map((h) => h.committed)) / 10) * 10)}
              />
              <p className="row-meta chart-caption">Last {plural(history.length, "completed sprint")}</p>
            </>
          )}
        </Panel>
      </div>

      <div className="insight-row">
        <Panel title="Work by status" context={`${plural(stats.tasks, "task")} · ${stats.points} pts`}>
          <div className="status-bars">
            {STATUSES.map((status) => {
              const s = stats.byStatus[status];
              return (
                <Progress key={status} label={status} value={s.tasks} max={Math.max(stats.tasks, 1)}
                  valueText={`${s.tasks} · ${s.points} pts`} showValue
                  variant={status === "Done" ? "success" : "accent"} size="sm" />
              );
            })}
          </div>
        </Panel>

        {active && (
          <Panel title={review ? "A small review can unblock the next step" : "Keep the pace steady"}>
            <div className="insight">
              <Lightbulb size={23} strokeWidth={1.75} className="insight-icon" aria-hidden />
              <div className="stack">
                <p className="insight-lead">
                  {remaining} points remain, {remaining > ideal ? "slightly above" : "at or below"} the ideal pace of{" "}
                  {ideal.toFixed(1)}. The sprint needs an average of {perDay.toFixed(1)} points per remaining working
                  day.
                </p>
                <p className="muted">
                  {review ? `Review ${review.id} today to keep work flowing. ` : ""}
                  Keep the remaining {todoPoints} to-do points in focus before adding scope.
                </p>
                {review && (
                  <span>
                    <Button variant="outline" render={routerLink(`/tasks/${review.id}`)}>
                      Review {review.id}
                    </Button>
                  </span>
                )}
              </div>
            </div>
          </Panel>
        )}
      </div>

      <p className="page-footnote">Points count as complete only when a task is Done.</p>
    </>
  );
}
