import type { ReactNode } from "react";
import { Alert } from "component-lib/alert";
import { Avatar } from "component-lib/avatar";
import { Badge, type BadgeVariant } from "component-lib/badge";
import { Card, CardBody, CardHeader } from "component-lib/card";
import { Progress } from "component-lib/progress";
import { Skeleton } from "component-lib/skeleton";
import { firstName, formatRange, plural } from "../lib/format";
import type { Priority, Sprint, TaskStatus } from "../shared/types";

const PRIORITY_VARIANT: Record<Priority, BadgeVariant> = {
  High: "warning",
  Medium: "neutral",
  Low: "neutral",
};

const STATUS_VARIANT: Record<TaskStatus, BadgeVariant> = {
  "To do": "neutral",
  "In progress": "info",
  "In review": "warning",
  Done: "success",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

export function PageHeading({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/** A Card with the design's "Content panel" header: an h2 and a muted context line. */
export function Panel({
  title,
  context,
  className,
  children,
}: {
  title: ReactNode;
  context?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card padding="lg" className={className}>
      <CardHeader
        title={<h2 className="section-title">{title}</h2>}
        actions={context ? <span className="section-context">{context}</span> : undefined}
      />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export function PersonName({ name, short = false }: { name: string | undefined; short?: boolean }) {
  if (!name) return <span className="person muted">Unassigned</span>;
  return (
    <span className="person">
      <Avatar name={name} size="sm" decorative />
      {short ? firstName(name) : name}
    </span>
  );
}

/**
 * Loading and error handling for a screen's queries: placeholders while the
 * first response is on its way, an alert if a request failed.
 */
export function QueryState({
  loading,
  error,
  lines = 6,
  children,
}: {
  loading: boolean;
  error?: Error;
  lines?: number;
  children: () => ReactNode;
}) {
  if (error) {
    return (
      <Alert variant="danger" title="This didn’t load">
        {error.message}
      </Alert>
    );
  }
  if (loading) {
    return (
      <Card padding="lg">
        <CardBody>
          <Skeleton lines={lines} label="Loading" />
        </CardBody>
      </Card>
    );
  }
  return <>{children()}</>;
}

/** The accent banner for an active sprint, shared by Overview, Sprints and Board. */
export function SprintBanner({ sprint }: { sprint: Sprint }) {
  const { stats } = sprint;
  return (
    <div className="sprint-banner">
      <div className="sprint-goal">
        <div className="sprint-meta">
          <span className="sprint-name">{sprint.name}</span>
          <Badge variant="accent">Active</Badge>
          <span className="sprint-dates">{formatRange(sprint.start, sprint.end)}</span>
        </div>
        <p className="sprint-goal-text">{sprint.goal}</p>
      </div>
      <div className="sprint-progress">
        <Progress
          label={`${stats.donePoints} / ${stats.points} pts complete`}
          value={stats.donePoints}
          max={Math.max(stats.points, 1)}
          showValue
        />
        <span className="sprint-remaining">
          {plural(sprint.daysLeft, "working day")} left · {stats.doneTasks} of {stats.tasks} tasks done
        </span>
      </div>
    </div>
  );
}
