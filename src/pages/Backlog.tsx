import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListOrdered, Search } from "lucide-react";
import { Badge } from "component-lib/badge";
import { Button } from "component-lib/button";
import { Select } from "component-lib/combobox";
import {
  createColumnHelper,
  DataGrid,
  type ColumnDef,
  type DataGridProps,
  type GridApi,
  type GridState,
} from "component-lib/data-grid";
import { Input } from "component-lib/input";
import { toast } from "component-lib/toaster";
import { useUserLookup } from "../api/lookups";
import { moveTasks, useProjectTasks, useSprints, useUsers } from "../api/queries";
import { useAuth } from "../auth/context";
import { ProjectLayout } from "../components/ProjectLayout";
import { routerLink } from "../components/routerLink";
import { TaskFormModal } from "../components/TaskFormModal";
import { PersonName, PriorityBadge, QueryState, StatusBadge } from "../components/ui";
import { formatRange, plural } from "../lib/format";
import { PRIORITIES, TASK_TYPES, type Project, type Sprint, type Task, type User } from "../shared/types";

const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: p }));
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 } as const;
const col = createColumnHelper<Task>();

type SharedGridProps = Omit<DataGridProps<Task>, "data" | "columns">;

function buildColumns(person: (id: string) => User | undefined, last: "sprint" | "status", sprintName: (id: string | null) => string) {
  const columns: ColumnDef<Task>[] = [
    col.field("id", { header: "ID", width: 88 }),
    col.field("title", {
      header: "Work item",
      minWidth: 240,
      width: 480,
      cell: ({ row, value }) => (
        <Link to={`/tasks/${row.id}`} className="grid-link">
          {value}
        </Link>
      ),
    }),
    col.field("type", { header: "Type", width: 82, options: TASK_TYPES.map((v) => ({ value: v, label: v })) }),
    col.field("priority", {
      header: "Priority",
      width: 96,
      options: PRIORITY_OPTIONS,
      cell: ({ value }) => <PriorityBadge priority={value} />,
    }),
    col.field("points", { header: "Points", type: "number", width: 92, align: "start" }),
    col.field("assigneeId", {
      header: "Assignee",
      width: 144,
      format: (id) => person(id)?.name ?? "",
      cell: ({ value }) => <PersonName name={person(value)?.name} short />,
    }),
  ];
  columns.push(
    last === "sprint"
      ? col.field("sprintId", {
          header: "Sprint",
          width: 124,
          format: (id) => sprintName(id),
          cell: ({ value }) => <span className="row-meta">{sprintName(value)}</span>,
        })
      : col.field("status", { header: "Status", width: 124, cell: ({ value }) => <StatusBadge status={value} /> }),
  );
  return columns;
}

const selectedIds = (state: GridState) =>
  Object.entries(state.rowSelection)
    .filter(([, on]) => on)
    .map(([id]) => String(id));

export function Backlog() {
  const { can } = useAuth();
  const [adding, setAdding] = useState(false);
  return (
    <ProjectLayout
      tab="backlog"
      actions={() => (can("task:create") ? <Button onClick={() => setAdding(true)}>Add task</Button> : null)}
    >
      {(project) => (
        <>
          <BacklogBody project={project} />
          <TaskFormModal open={adding} onOpenChange={setAdding} projectSlug={project.slug} />
        </>
      )}
    </ProjectLayout>
  );
}

function BacklogBody({ project }: { project: Project }) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const tasks = useProjectTasks(project.slug);
  const sprints = useSprints(project.slug);
  const users = useUsers();
  const person = useUserLookup();
  const [query, setQuery] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const backlogGrid = useRef<GridApi<Task>>(null);
  const canPlan = can("sprint:manage");

  const sprintName = (id: string | null) => sprints.data?.find((s) => s.id === id)?.name ?? "Unscheduled";
  const plannedColumns = buildColumns(person, "sprint", sprintName);
  const sprintColumns = buildColumns(person, "status", sprintName);

  const q = query.trim().toLowerCase();
  const visible = (tasks.data ?? []).filter(
    (t) =>
      (!q || `${t.id} ${t.title}`.toLowerCase().includes(q)) &&
      (!assignee || t.assigneeId === assignee) &&
      (!priority || t.priority === priority),
  );
  const points = (list: Task[]) => list.reduce((n, t) => n + t.points, 0);
  const unscheduled = visible
    .filter((t) => !t.sprintId)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const open = (sprints.data ?? []).filter((s) => s.status !== "completed").sort((a, b) => b.start.localeCompare(a.start));
  const nextSprint = open.find((s) => s.status === "planned");
  const completed = (sprints.data ?? []).filter((s) => s.status === "completed");
  const archived = completed.reduce((n, s) => n + s.stats.doneTasks, 0);

  const moveToSprint = async () => {
    if (!nextSprint) return;
    try {
      const moved = await moveTasks(selected, nextSprint.id);
      toast.success(`${plural(moved.length, "task")} moved to ${nextSprint.name}`);
      backlogGrid.current?.clearSelection();
      setSelected([]);
    } catch (e) {
      toast.error("Couldn’t move the tasks", { description: (e as Error).message });
    }
  };

  const grid: SharedGridProps = {
    getRowId: "id",
    autoHeight: true,
    toolbar: false,
    enablePagination: false,
    enableColumnReordering: false,
    rowHeight: 50,
    headerHeight: 38,
    onRowClick: (task: Task) => navigate(`/tasks/${task.id}`),
    emptyState: <p className="empty-note">No work items here.</p>,
  };

  return (
    <>
      <div className="filters">
        <Input aria-label="Search by title or ID" placeholder="Search by title or ID"
          leading={<Search size={15} aria-hidden />} value={query} onValueChange={setQuery} clearable
          className="filter-search" />
        <Select aria-label="Assignee" placeholder="All assignees"
          options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))} value={assignee}
          onChange={setAssignee} searchable={false} className="filter-select" />
        <Select aria-label="Priority" placeholder="All priorities" options={PRIORITY_OPTIONS} value={priority}
          onChange={setPriority} searchable={false} className="filter-select" />
        <span className="filter-count">
          {plural(visible.length, "work item")} · {points(visible)} points
        </span>
      </div>

      <QueryState loading={tasks.loading || sprints.loading} error={tasks.error ?? sprints.error}>
        {() => (
          <>
            <section className="backlog-group" aria-labelledby="group-backlog">
              <div className="group-heading">
                <div className="group-label">
                  <ListOrdered size={18} strokeWidth={1.75} aria-hidden />
                  <h2 id="group-backlog" className="section-title">Product backlog</h2>
                  <Badge>
                    {plural(unscheduled.length, "item")} · {points(unscheduled)} pts
                  </Badge>
                </div>
                {canPlan && (
                  <Button variant="outline" disabled={selected.length === 0 || !nextSprint} onClick={moveToSprint}
                    title={nextSprint ? undefined : "Create a sprint first"}>
                    {nextSprint ? `Move selected to ${nextSprint.name}` : "No upcoming sprint"}
                  </Button>
                )}
              </div>
              <p className="row-meta">
                Unscheduled · Highest priority first. Refine these before bringing them into a sprint.
              </p>
              <DataGrid {...grid} ref={backlogGrid} aria-label="Product backlog" data={unscheduled}
                columns={plannedColumns} enableRowSelection={canPlan}
                onStateChange={(s) => setSelected(selectedIds(s))} />
            </section>

            {open.map((sprint) => (
              <SprintGroup key={sprint.id} sprint={sprint} slug={project.slug}
                items={visible.filter((t) => t.sprintId === sprint.id)} grid={grid}
                columns={sprint.status === "active" ? sprintColumns : plannedColumns} />
            ))}

            <p className="page-footnote">
              {plural((tasks.data ?? []).length, "current work item")}
              {archived > 0 && ` · ${plural(archived, "completed task")} archived from ${plural(completed.length, "earlier sprint")}`}
              . Estimates use story points.
            </p>
          </>
        )}
      </QueryState>
    </>
  );
}

interface SprintGroupProps {
  sprint: Sprint;
  slug: string;
  items: Task[];
  columns: ColumnDef<Task>[];
  grid: SharedGridProps;
}

function SprintGroup({ sprint, slug, items, columns, grid }: SprintGroupProps) {
  const active = sprint.status === "active";
  return (
    <section className="backlog-group" aria-labelledby={`group-${sprint.id}`}>
      <div className="group-heading">
        <div className="group-label">
          <h2 id={`group-${sprint.id}`} className="section-title">{sprint.name}</h2>
          <Badge variant={active ? "accent" : "neutral"}>{active ? "Active" : "Planned"}</Badge>
          <span className="row-meta">
            {formatRange(sprint.start, sprint.end, false)} · {plural(items.length, "item")} ·{" "}
            {items.reduce((n, t) => n + t.points, 0)} pts
          </span>
        </div>
        <Button variant="outline" render={routerLink(`/projects/${slug}/${active ? "board" : "sprints"}`)}>
          {active ? "Open board" : "Plan sprint"}
        </Button>
      </div>
      <DataGrid {...grid} aria-label={`${sprint.name} work`} data={items} columns={columns} />
    </section>
  );
}
