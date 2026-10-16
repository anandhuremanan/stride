import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FolderKanban, Search } from "lucide-react";
import { Badge } from "component-lib/badge";
import { Button } from "component-lib/button";
import { Card, CardBody, CardFooter, CardHeader } from "component-lib/card";
import { Select } from "component-lib/combobox";
import { Input } from "component-lib/input";
import { Modal } from "component-lib/modal";
import { Progress } from "component-lib/progress";
import { Empty } from "component-lib/skeleton";
import { Textarea } from "component-lib/textarea";
import { toast } from "component-lib/toaster";
import { useUserLookup } from "../api/lookups";
import { createProject, useProjects, useSprints, useUsers } from "../api/queries";
import { useAuth } from "../auth/context";
import { AppShell } from "../components/AppShell";
import { routerLink } from "../components/routerLink";
import { PageHeading, Panel, PersonName, QueryState } from "../components/ui";
import { formatDate, plural } from "../lib/format";
import type { ProjectStatus } from "../shared/types";

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Planning", label: "Planning" },
];

export function Projects() {
  const { user, workspace, can } = useAuth();
  const projects = useProjects();
  const users = useUsers();
  const person = useUserLookup();
  const [params, setParams] = useSearchParams();
  const creating = params.get("new") === "1" && can("project:create");
  const setCreating = (open: boolean) => setParams(open ? { new: "1" } : {}, { replace: true });

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);

  const list = projects.data ?? [];
  const q = query.trim().toLowerCase();
  const visible = list.filter(
    (p) =>
      (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)) &&
      (!status || p.status === status) &&
      (!owner || p.ownerId === owner),
  );
  const ownerOptions = [...new Set(list.map((p) => p.ownerId))].map((id) => ({
    value: id,
    label: person(id)?.name ?? "…",
  }));

  // "Pick up where you left off": the active project this person owns, else any active one.
  const recent = list.find((p) => p.status === "Active" && p.ownerId === user.id) ?? list.find((p) => p.status === "Active");

  return (
    <AppShell breadcrumbs={[{ label: "Projects" }]}>
      <PageHeading
        title="Projects"
        description="A simple home for every team’s work."
        actions={can("project:create") ? <Button onClick={() => setCreating(true)}>Create project</Button> : undefined}
      />

      <div className="filters">
        <Input aria-label="Search projects" placeholder="Search projects" leading={<Search size={15} aria-hidden />}
          value={query} onValueChange={setQuery} clearable className="filter-search" />
        <Select aria-label="Status" placeholder="All statuses" options={STATUS_OPTIONS} value={status}
          onChange={setStatus} searchable={false} className="filter-select" />
        <Select aria-label="Owner" placeholder="All owners" options={ownerOptions} value={owner}
          onChange={setOwner} searchable={false} className="filter-select" />
        <span className="filter-count">{plural(visible.length, "project")}</span>
      </div>

      <QueryState loading={projects.loading} error={projects.error}>
        {() =>
          list.length === 0 ? (
            <Empty
              title="No projects yet"
              description={
                can("project:create")
                  ? "A project holds a backlog, its sprints and a board. Start with the work that matters most."
                  : "Once an admin creates a project, it will appear here."
              }
              actions={can("project:create") ? <Button onClick={() => setCreating(true)}>Create project</Button> : undefined}
            />
          ) : (
          <section className="project-grid" aria-label="Project directory">
            {visible.map((p) => (
              <Card key={p.id} className={p.id === recent?.id ? "project-card is-recent" : "project-card"}>
                <CardHeader
                  title={
                    <h2 className="card-title">
                      <Link to={`/projects/${p.slug}`} className="card-link">
                        {p.name}
                      </Link>
                    </h2>
                  }
                  description={p.description || "No description yet."}
                  actions={<ProjectStatusBadge status={p.status} />}
                />
                <CardBody>
                  <Progress label="Tasks complete" value={p.tasksDone} max={Math.max(p.tasksTotal, 1)}
                    valueText={`${p.tasksDone} of ${p.tasksTotal}`} showValue size="sm" />
                </CardBody>
                <CardFooter>
                  <div className="project-card-footer">
                    <PersonName name={person(p.ownerId)?.name} />
                    <span className="row-meta">
                      Next: {p.milestone} · {formatDate(p.milestoneDate)}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            ))}
            {visible.length === 0 && <p className="empty-note">No projects match these filters.</p>}
          </section>
          )
        }
      </QueryState>

      {list.length > 0 && (
      <div className="guidance-row">
        <Panel title="Pick up where you left off" className="guidance-main">
          {recent ? <RecentProject slug={recent.slug} name={recent.name} /> : <p className="empty-note">No active projects yet.</p>}
        </Panel>
        <Panel title="A little structure goes a long way" className="guidance-side">
          <p className="guidance-text">
            Give each project a clear owner and a next milestone. Keep the rest in your backlog until it’s ready.
          </p>
          <a href="#how-we-work" className="section-link">
            How we work at {workspace.name} ↗
          </a>
        </Panel>
      </div>

      )}

      <p className="page-footnote">All projects are shared with the {workspace.name} team.</p>

      <Modal open={creating} onOpenChange={setCreating} title="Create a project" size="md">
        {creating && <CreateProjectForm users={users.data ?? []} onDone={() => setCreating(false)} />}
      </Modal>
    </AppShell>
  );
}

function RecentProject({ slug, name }: { slug: string; name: string }) {
  const sprints = useSprints(slug);
  const sprint = sprints.data?.find((s) => s.status === "active");
  const review = sprint?.stats.byStatus["In review"].tasks ?? 0;
  return (
    <div className="recent-project">
      <span className="recent-symbol" aria-hidden>
        <FolderKanban size={24} strokeWidth={1.75} />
      </span>
      <div className="row-text recent-context">
        <span className="row-title">{name}</span>
        <span className="muted">
          {sprint
            ? `${sprint.name} · ${sprint.stats.donePoints} of ${sprint.stats.points} points delivered`
            : "No sprint running"}
        </span>
        {sprint && (
          <span className="row-meta">
            {review === 0 ? "Nothing is waiting for review." : `${plural(review, "task")} ready for review.`}
          </span>
        )}
      </div>
      <Button variant="outline" render={routerLink(`/projects/${slug}/board`)}>
        Open board
      </Button>
    </div>
  );
}

function CreateProjectForm({ users, onDone }: { users: { id: string; name: string; status: string }[]; onDone: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(user.id);
  const keyValid = /^[A-Z]{2,4}$/.test(key);

  const submit = async () => {
    try {
      const project = await createProject({ name, key, description, ownerId: ownerId ?? user.id });
      toast.success(`${project.name} created`);
      onDone();
      navigate(`/projects/${project.slug}`);
    } catch (e) {
      toast.error("Couldn’t create the project", { description: (e as Error).message });
    }
  };

  return (
    <form className="stack form-stack" onSubmit={(e) => e.preventDefault()}>
      <div className="field-pair field-pair-wide">
        <Input label="Project name" value={name} onValueChange={setName} required autoFocus maxLength={60} />
        <Input label="Task prefix" value={key} maxLength={4} onValueChange={(v) => setKey(v.toUpperCase())}
          error={key && !keyValid ? "2–4 letters" : undefined} required />
      </div>
      <Textarea label="Description" value={description} onValueChange={setDescription} rows={2} maxLength={140} showCount />
      <Select label="Owner" options={users.filter((u) => u.status === "active").map((u) => ({ value: u.id, label: u.name }))}
        value={ownerId} onChange={setOwnerId} clearable={false} />
      <div className="button-row modal-actions">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || !keyValid} onClick={submit} loadingText="Creating…">
          Create project
        </Button>
      </div>
    </form>
  );
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={status === "Active" ? "accent" : "neutral"}>{status}</Badge>;
}
