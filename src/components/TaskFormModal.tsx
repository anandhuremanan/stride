import { useState } from "react";
import { Button } from "component-lib/button";
import { Select } from "component-lib/combobox";
import { Input } from "component-lib/input";
import { Modal } from "component-lib/modal";
import { Textarea } from "component-lib/textarea";
import { toast } from "component-lib/toaster";
import { createTask, useProjects, useSprints, useUsers } from "../api/queries";
import { useAuth } from "../auth/context";
import { ESTIMATES, PRIORITIES, TASK_TYPES, type Priority, type TaskType } from "../shared/types";

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fix the project; without it the form asks for one. */
  projectSlug?: string;
  /** Preselect a sprint, e.g. the active one on the board. */
  sprintId?: string | null;
}

const TYPE_OPTIONS = TASK_TYPES.map((t) => ({ value: t, label: t }));
const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: p }));
const ESTIMATE_OPTIONS = ESTIMATES.map((n) => ({ value: n, label: `${n} points` }));

export function TaskFormModal({ open, onOpenChange, projectSlug, sprintId = null }: TaskFormModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add a task" size="md">
      {/* Mounted only while open, so every opening starts with an empty form. */}
      {open && <TaskForm projectSlug={projectSlug} sprintId={sprintId} onDone={() => onOpenChange(false)} />}
    </Modal>
  );
}

function TaskForm({ projectSlug, sprintId, onDone }: { projectSlug?: string; sprintId: string | null; onDone: () => void }) {
  const { user } = useAuth();
  const projects = useProjects();
  const users = useUsers();
  const [slug, setSlug] = useState<string | null>(projectSlug ?? null);
  const sprints = useSprints(slug ?? undefined);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string | null>("Task");
  const [priority, setPriority] = useState<string | null>("Medium");
  const [points, setPoints] = useState<number | null>(2);
  const [assignee, setAssignee] = useState<string | null>(user.id);
  const [sprint, setSprint] = useState<string | null>(sprintId);
  const [description, setDescription] = useState("");

  const sprintOptions = (sprints.data ?? [])
    .filter((s) => s.status !== "completed")
    .map((s) => ({ value: s.id, label: `${s.name} · ${s.status === "active" ? "Active" : "Planned"}` }));

  const submit = async () => {
    if (!slug) return;
    try {
      const task = await createTask(slug, {
        title,
        type: type as TaskType,
        priority: priority as Priority,
        points: points ?? 2,
        assigneeId: assignee ?? user.id,
        sprintId: sprint,
        description,
      });
      toast.success(`${task.id} created`, { description: task.title });
      onDone();
    } catch (e) {
      toast.error("Couldn’t create the task", { description: (e as Error).message });
    }
  };

  return (
    // Enter in a field clicks the submit button, whose onClick does the work
    // (and gives the kit Button its loading state).
    <form className="stack form-stack" onSubmit={(e) => e.preventDefault()}>
      {!projectSlug && (
        <Select label="Project" options={(projects.data ?? []).map((p) => ({ value: p.slug, label: p.name }))}
          value={slug} onChange={(v) => { setSlug(v); setSprint(null); }} required />
      )}
      <Input label="Title" value={title} onValueChange={setTitle} required autoFocus maxLength={120} />
      <div className="field-pair">
        <Select label="Type" options={TYPE_OPTIONS} value={type} onChange={setType} clearable={false} searchable={false} />
        <Select label="Priority" options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} clearable={false}
          searchable={false} />
      </div>
      <div className="field-pair">
        <Select label="Assignee" options={(users.data ?? []).filter((u) => u.status === "active").map((u) => ({ value: u.id, label: u.name }))}
          value={assignee} onChange={setAssignee} clearable={false} />
        <Select label="Estimate" options={ESTIMATE_OPTIONS} value={points} onChange={setPoints} clearable={false}
          searchable={false} />
      </div>
      <Select label="Sprint" placeholder="Backlog (unscheduled)" options={sprintOptions} value={sprint}
        onChange={setSprint} searchable={false} disabled={!slug} />
      <Textarea label="Description" value={description} onValueChange={setDescription} rows={3} />
      <div className="button-row modal-actions">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!slug || !title.trim()} onClick={submit} loadingText="Creating…">
          Create task
        </Button>
      </div>
    </form>
  );
}
