import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, EllipsisVertical, KeyRound, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { Alert } from "component-lib/alert";
import { Avatar } from "component-lib/avatar";
import { Badge } from "component-lib/badge";
import { Button } from "component-lib/button";
import { Select } from "component-lib/combobox";
import { DatePicker } from "component-lib/date-picker";
import { Input } from "component-lib/input";
import { Menu, MenuItem } from "component-lib/menu";
import { Modal } from "component-lib/modal";
import { toast } from "component-lib/toaster";
import {
  addMember,
  changeRole,
  resetPassword,
  setMemberStatus,
  updateProject,
  updateWorkspace,
  useProjects,
  useUsers,
  type NewAccount,
} from "../api/queries";
import { useAuth } from "../auth/context";
import { AppShell } from "../components/AppShell";
import { PageHeading, Panel, QueryState } from "../components/ui";
import { plural, toIsoDay } from "../lib/format";
import { assignableRoles, ROLE_DESCRIPTION, ROLE_LABEL } from "../shared/rbac";
import { ROLES, type Project, type Role, type User } from "../shared/types";

const TIME_ZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];
const WEEK_STARTS = ["Monday", "Sunday", "Saturday"].map((d) => ({ value: d, label: d }));
const SPRINT_LENGTHS = ["1 week", "2 weeks", "3 weeks", "4 weeks"].map((d) => ({ value: d, label: d }));

/** Whether `me` may change `member`'s role, password or status. Mirrors the server's rule. */
function canManage(me: User, member: User) {
  if (member.id === me.id || member.role === "owner") return false;
  if (me.role === "owner") return true;
  return me.role === "admin" && member.role !== "admin";
}

export function TeamSettings() {
  const { user, workspace, can } = useAuth();
  const users = useUsers();
  const projects = useProjects();
  const [params, setParams] = useSearchParams();
  const adding = params.get("add") === "1" && can("members:invite");
  const setAdding = (open: boolean) => setParams(open ? { add: "1" } : {}, { replace: true });
  /** The one-time password to show after adding someone or resetting theirs. */
  const [handover, setHandover] = useState<NewAccount & { reason: "added" | "reset" } | null>(null);

  const members = users.data ?? [];
  const active = members.filter((m) => m.status === "active");

  return (
    <AppShell breadcrumbs={[{ label: "Team & settings" }]}>
      <PageHeading
        title="Team & settings"
        description="Good work starts with the right people and a few clear defaults."
        actions={can("members:invite") ? <Button onClick={() => setAdding(true)}>Add people</Button> : undefined}
      />

      <QueryState loading={users.loading} error={users.error}>
        {() => (
          <Panel title="Team members" context={`${plural(active.length, "member")} · ${workspace.name}`}>
            {members.length === 1 && can("members:invite") && (
              <Alert variant="info" size="sm" title="It’s just you so far."
                actions={<Button size="sm" variant="outline" onClick={() => setAdding(true)}>Add people</Button>}>
                Add your teammates so you can assign them work.
              </Alert>
            )}
            <div className="members">
              <div className="members-head" aria-hidden>
                <span>Member</span>
                <span>Focus</span>
                <span>Workspace role</span>
                <span>Status</span>
                <span />
              </div>
              <ul className="row-list">
                {members.map((m) => (
                  <MemberRow key={m.id} member={m} me={user} onReset={(r) => setHandover({ ...r, reason: "reset" })} />
                ))}
              </ul>
            </div>
            <p className="panel-hint with-icon">
              <Users size={16} strokeWidth={1.75} aria-hidden />
              Members create and update tasks. Admins also manage people, projects and sprints. Viewers can only read.
            </p>
          </Panel>
        )}
      </QueryState>

      <div className="settings-row">
        <Panel title="Workspace basics">
          <WorkspaceForm key={`${workspace.name}|${workspace.timeZone}|${workspace.weekStart}`} />
        </Panel>
        <Panel title="Project basics">
          <QueryState loading={projects.loading} error={projects.error} lines={4}>
            {() =>
              projects.data!.length === 0 ? (
                <p className="empty-note">No projects yet. Create one from the Projects page.</p>
              ) : (
                <ProjectSettings projects={projects.data!} users={active} />
              )
            }
          </QueryState>
        </Panel>
      </div>

      <Panel title="Roles and permissions" context={`You’re ${ROLE_LABEL[user.role].toLowerCase()}`}>
        <ul className="role-list">
          {ROLES.map((role) => (
            <li key={role} className={role === user.role ? "role-item is-you" : "role-item"}>
              <ShieldCheck size={16} strokeWidth={1.75} aria-hidden />
              <span className="row-title">{ROLE_LABEL[role]}</span>
              <span className="muted">{ROLE_DESCRIPTION[role]}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Modal open={adding} onOpenChange={setAdding} title="Add a teammate"
        description="They’ll sign in with a one-time password and then choose their own." size="sm">
        {adding && (
          <AddMemberForm
            actorRole={user.role}
            onCancel={() => setAdding(false)}
            onAdded={(account) => {
              setAdding(false);
              setHandover({ ...account, reason: "added" });
            }}
          />
        )}
      </Modal>

      <Modal open={handover !== null} onOpenChange={(open) => !open && setHandover(null)} size="sm"
        title={handover?.reason === "reset" ? "Password reset" : `${handover?.user.name ?? ""} is in`}
        footer={({ close }) => <Button onClick={close}>Done</Button>}>
        {handover && <Handover account={handover} />}
      </Modal>
    </AppShell>
  );
}

function MemberRow({ member, me, onReset }: { member: User; me: User; onReset: (account: NewAccount) => void }) {
  const you = member.id === me.id;
  const manageable = canManage(me, member);
  const roles = manageable ? assignableRoles(me.role, member.role) : [];
  const inactive = member.status === "deactivated";

  const run = async (action: () => Promise<unknown>, success: string, failure: string) => {
    try {
      await action();
      toast.success(success);
    } catch (e) {
      toast.error(failure, { description: (e as Error).message });
    }
  };

  return (
    <li className={inactive ? "member-row is-inactive" : "member-row"}>
      <span className="member-identity">
        <Avatar name={member.name} size="sm" decorative />
        <span className="row-text">
          <span className="row-title">
            {member.name}
            {you && " (you)"}
          </span>
          <span className="row-meta">{member.email}</span>
        </span>
      </span>
      <span className="muted member-focus">{member.focus || "—"}</span>
      <span className="member-role">
        {roles.length === 0 || inactive ? (
          <Badge>{ROLE_LABEL[member.role]}</Badge>
        ) : (
          <Select
            aria-label={`Workspace role for ${member.name}`}
            options={[...new Set([member.role, ...roles])].map((r) => ({ value: r, label: ROLE_LABEL[r], description: ROLE_DESCRIPTION[r] }))}
            value={member.role}
            onChange={(r) =>
              r && r !== member.role &&
              void run(() => changeRole(member.id, r as Role), `${member.name} is now ${ROLE_LABEL[r as Role].toLowerCase()}`, "Couldn’t change the role")
            }
            clearable={false}
            searchable={false}
            size="sm"
            className="role-select"
          />
        )}
      </span>
      <span className="member-status">
        <Badge variant={inactive ? "neutral" : member.mustChangePassword ? "warning" : "accent"}>
          {inactive ? "Deactivated" : member.mustChangePassword ? "Hasn’t signed in" : "Active"}
        </Badge>
      </span>
      <span className="member-actions">
        {manageable && (
          <Menu label={`Actions for ${member.name}`} align="end"
            trigger={<Button variant="ghost" size="sm" icon={<EllipsisVertical size={16} />} aria-label={`Actions for ${member.name}`} />}>
            {!inactive && (
              <MenuItem icon={<KeyRound size={15} />}
                onSelect={() => void resetPassword(member.id).then(onReset, (e: Error) => toast.error("Couldn’t reset the password", { description: e.message }))}>
                Reset password
              </MenuItem>
            )}
            {inactive ? (
              <MenuItem icon={<UserCheck size={15} />}
                onSelect={() => void run(() => setMemberStatus(member.id, "active"), `${member.name} can sign in again`, "Couldn’t reactivate")}>
                Reactivate
              </MenuItem>
            ) : (
              <MenuItem icon={<UserX size={15} />} destructive
                onSelect={() => void run(() => setMemberStatus(member.id, "deactivated"), `${member.name} was deactivated`, "Couldn’t deactivate")}>
                Deactivate
              </MenuItem>
            )}
          </Menu>
        )}
      </span>
    </li>
  );
}

function AddMemberForm({ actorRole, onCancel, onAdded }: { actorRole: Role; onCancel: () => void; onAdded: (a: NewAccount) => void }) {
  const roles: Role[] = actorRole === "owner" ? ["admin", "member", "viewer"] : ["member", "viewer"];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [focus, setFocus] = useState("");
  const [role, setRole] = useState<string | null>("member");
  const invalid = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email);

  const submit = async () => {
    try {
      onAdded(await addMember({ name, email, role: role as Role, focus }));
    } catch (e) {
      toast.error("Couldn’t add them", { description: (e as Error).message });
    }
  };

  return (
    <form className="stack form-stack" onSubmit={(e) => e.preventDefault()}>
      <Input label="Name" value={name} onValueChange={setName} required autoFocus maxLength={80} />
      <Input label="Work email" type="email" value={email} onValueChange={setEmail} required
        error={invalid ? "Enter a valid email address" : undefined} />
      <Input label="Focus" description="Optional, e.g. Designer or QA." value={focus} onValueChange={setFocus} maxLength={60} />
      <Select label="Workspace role" value={role} onChange={setRole} clearable={false} searchable={false}
        options={roles.map((r) => ({ value: r, label: ROLE_LABEL[r], description: ROLE_DESCRIPTION[r] }))} />
      <div className="button-row modal-actions">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" onClick={submit} disabled={!name.trim() || !email || invalid || !role} loadingText="Adding…">
          Add teammate
        </Button>
      </div>
    </form>
  );
}

/** Shows a one-time password once, for the admin to pass on. */
function Handover({ account }: { account: NewAccount & { reason: "added" | "reset" } }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account.temporaryPassword);
      toast.success("Password copied");
    } catch {
      toast.error("Couldn’t copy. Select the password and copy it yourself.");
    }
  };
  return (
    <div className="stack">
      <p className="body-text">
        {account.reason === "reset" ? "Their old password no longer works. " : ""}
        Give <strong>{account.user.name}</strong> this one-time password. They’ll sign in with{" "}
        <strong>{account.user.email}</strong> and choose their own.
      </p>
      <div className="temp-password">
        <code>{account.temporaryPassword}</code>
        <Button variant="outline" size="sm" leading={<Copy size={14} />} onClick={copy}>
          Copy
        </Button>
      </div>
      <Alert variant="warning" size="sm" title="You won’t see this password again." />
    </div>
  );
}

function WorkspaceForm() {
  const { workspace, can } = useAuth();
  const editable = can("workspace:manage");
  const [name, setName] = useState(workspace.name);
  const [timeZone, setTimeZone] = useState<string | null>(workspace.timeZone);
  const [weekStart, setWeekStart] = useState<string | null>(workspace.weekStart);
  const dirty = name !== workspace.name || timeZone !== workspace.timeZone || weekStart !== workspace.weekStart;
  const zones = [...new Set([workspace.timeZone, ...TIME_ZONES])].map((z) => ({ value: z, label: z.replace("_", " ") }));

  const save = async () => {
    try {
      await updateWorkspace({ name, timeZone: timeZone ?? undefined, weekStart: weekStart ?? undefined });
      toast.success("Workspace saved");
    } catch (e) {
      toast.error("Couldn’t save the workspace", { description: (e as Error).message });
    }
  };

  return (
    <div className="stack form-stack">
      <Input label="Workspace name" value={name} onValueChange={setName} readOnly={!editable} maxLength={60}
        error={name.trim() ? undefined : "Give the workspace a name"} />
      <div className="field-pair">
        <Select label="Time zone" options={zones} value={timeZone} onChange={setTimeZone} clearable={false}
          disabled={!editable} />
        <Select label="Week starts on" options={WEEK_STARTS} value={weekStart} onChange={setWeekStart}
          clearable={false} searchable={false} disabled={!editable} />
      </div>
      {editable ? (
        <span>
          <Button onClick={save} disabled={!dirty || !name.trim()} loadingText="Saving…">
            Save workspace
          </Button>
        </span>
      ) : (
        <p className="row-meta">Only owners and admins can change workspace settings.</p>
      )}
    </div>
  );
}

function ProjectSettings({ projects, users }: { projects: Project[]; users: User[] }) {
  const [slug, setSlug] = useState<string | null>(projects[0]?.slug ?? null);
  const project = projects.find((p) => p.slug === slug) ?? projects[0];
  return (
    <div className="stack form-stack">
      <Select label="Project" options={projects.map((p) => ({ value: p.slug, label: p.name }))} value={project.slug}
        onChange={setSlug} clearable={false} searchable={false} />
      {/* Keyed so switching project, or a saved change, resets the form to the server's values. */}
      <ProjectForm key={JSON.stringify(project)} project={project} users={users} />
    </div>
  );
}

function ProjectForm({ project, users }: { project: Project; users: User[] }) {
  const { can } = useAuth();
  const editable = can("project:manage");
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [description, setDescription] = useState(project.description);
  const [ownerId, setOwnerId] = useState<string | null>(project.ownerId);
  const [sprintLength, setSprintLength] = useState<string | null>(project.sprintLength);
  const [milestone, setMilestone] = useState(project.milestone);
  const [milestoneDate, setMilestoneDate] = useState<string>(project.milestoneDate);
  const keyValid = /^[A-Z]{2,4}$/.test(key);
  const dirty =
    name !== project.name ||
    key !== project.key ||
    description !== project.description ||
    ownerId !== project.ownerId ||
    sprintLength !== project.sprintLength ||
    milestone !== project.milestone ||
    milestoneDate !== project.milestoneDate;

  const save = async () => {
    try {
      await updateProject(project.slug, {
        name,
        key,
        description,
        ownerId: ownerId ?? undefined,
        sprintLength: sprintLength ?? undefined,
        milestone,
        milestoneDate,
      });
      toast.success(`${name} saved`);
    } catch (e) {
      toast.error("Couldn’t save the project", { description: (e as Error).message });
    }
  };

  return (
    <>
      <div className="field-pair field-pair-wide">
        <Input label="Project name" value={name} onValueChange={setName} readOnly={!editable} maxLength={60} />
        <Input label="Task prefix" value={key} maxLength={4} readOnly={!editable}
          onValueChange={(v) => setKey(v.toUpperCase())} error={keyValid ? undefined : "2–4 letters"} />
      </div>
      <Input label="Description" value={description} onValueChange={setDescription} readOnly={!editable} maxLength={140} />
      <div className="field-pair">
        <Select label="Project owner" options={users.map((u) => ({ value: u.id, label: u.name }))} value={ownerId}
          onChange={setOwnerId} clearable={false} disabled={!editable} />
        <Select label="Sprint length" options={SPRINT_LENGTHS} value={sprintLength} onChange={setSprintLength}
          clearable={false} searchable={false} disabled={!editable} />
      </div>
      <div className="field-pair">
        <Input label="Next milestone" value={milestone} onValueChange={setMilestone} readOnly={!editable} maxLength={80} />
        <DatePicker label="Milestone date" value={milestoneDate} readOnly={!editable} clearable={false}
          onChange={(d) => d && setMilestoneDate(toIsoDay(d))} />
      </div>
      {editable ? (
        <span>
          <Button variant="outline" onClick={save} disabled={!dirty || !name.trim() || !keyValid} loadingText="Saving…">
            Save project
          </Button>
        </span>
      ) : (
        <p className="row-meta">Only owners and admins can change project settings.</p>
      )}
    </>
  );
}
