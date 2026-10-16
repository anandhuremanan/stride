import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  CircleCheck,
  Folder,
  Folders,
  KeyRound,
  Layers2,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Users,
} from "lucide-react";
import { Avatar } from "component-lib/avatar";
import { Breadcrumb, type BreadcrumbItem } from "component-lib/breadcrumb";
import { Button } from "component-lib/button";
import { Menu, MenuGroup, MenuItem, MenuSeparator } from "component-lib/menu";
import { Modal } from "component-lib/modal";
import { useProjects, useUsers } from "../api/queries";
import { useAuth } from "../auth/context";
import { formatLongDate, plural } from "../lib/format";
import { PasswordForm } from "../pages/ChangePassword";
import { ROLE_LABEL } from "../shared/rbac";
import { routerLink } from "./routerLink";

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const WORKSPACE_LINKS: NavEntry[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projects", icon: Folders, end: true },
  { to: "/my-tasks", label: "My tasks", icon: CircleCheck },
  { to: "/team", label: "Team & settings", icon: Users },
];

interface AppShellProps {
  /** Crumbs after the workspace name, which is always first. */
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
}

export function AppShell({ breadcrumbs, children }: AppShellProps) {
  const { user, workspace } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <div className="app">
      <aside className="sidebar">
        <SidebarContent onChangePassword={() => setPasswordOpen(true)} />
      </aside>

      {/* Below the tablet breakpoint the sidebar lives in a drawer. */}
      <Modal open={navOpen} onOpenChange={setNavOpen} placement="left" size="sm" aria-label="Navigation"
        classNames={{ root: "nav-drawer", body: "nav-drawer-body" }}>
        <SidebarContent
          onNavigate={() => setNavOpen(false)}
          onChangePassword={() => {
            setNavOpen(false);
            setPasswordOpen(true);
          }}
        />
      </Modal>

      <div className="app-main">
        <header className="app-header">
          <Button variant="ghost" size="sm" icon={<MenuIcon size={20} />} aria-label="Open navigation"
            className="nav-toggle" onClick={() => setNavOpen(true)} />
          <Breadcrumb items={[{ label: workspace.name, href: "/" }, ...breadcrumbs]} renderLink={routerLink()}
            maxItems={3} className="header-crumbs" />
          <div className="header-actions">
            <span className="header-date">{formatLongDate(workspace.today)}</span>
            <Avatar name={user.name} size="sm" />
          </div>
        </header>
        <main className="page">{children}</main>
      </div>

      <Modal open={passwordOpen} onOpenChange={setPasswordOpen} title="Change password" size="sm">
        {passwordOpen && <PasswordForm onDone={() => setPasswordOpen(false)} />}
      </Modal>
    </div>
  );
}

function SidebarContent({ onNavigate, onChangePassword }: { onNavigate?: () => void; onChangePassword: () => void }) {
  const { user, workspace, logout, can } = useAuth();
  const projects = useProjects();
  const users = useUsers();
  const memberCount = users.data?.filter((u) => u.status === "active").length;

  const item = ({ to, label, icon: Icon, end }: NavEntry) => (
    <li key={to}>
      <NavLink to={to} end={end} className="nav-item" onClick={onNavigate}>
        <Icon size={17} strokeWidth={1.75} aria-hidden />
        <span>{label}</span>
      </NavLink>
    </li>
  );

  return (
    <div className="sidebar-content">
      <Link to="/" className="brand" onClick={onNavigate}>
        <span className="brand-mark" aria-hidden>
          <Layers2 size={19} strokeWidth={1.75} />
        </span>
        <span className="brand-name">stride</span>
      </Link>

      <div className="workspace-switcher">
        <span className="workspace-name">{workspace.name}</span>
        <span className="workspace-plan">
          Team workspace{memberCount !== undefined && ` · ${plural(memberCount, "member")}`}
        </span>
      </div>

      <nav aria-label="Workspace" className="nav-group">
        <h2 className="nav-heading">Workspace</h2>
        <ul>{WORKSPACE_LINKS.map(item)}</ul>
      </nav>

      <nav aria-label="Your projects" className="nav-group">
        <h2 className="nav-heading">Your projects</h2>
        <ul>
          {projects.data?.map((p) => item({ to: `/projects/${p.slug}`, label: p.name, icon: Folder }))}
          {projects.data?.length === 0 &&
            (can("project:create")
              ? item({ to: "/projects?new=1", label: "New project", icon: Plus })
              : <li className="nav-empty">No projects yet</li>)}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <hr className="sidebar-divider" />
        <Menu
          label="Account"
          side="top"
          trigger={
            <Button variant="ghost" className="account" fullWidth aria-label={`Account: ${user.name}`}>
              <Avatar name={user.name} size="sm" decorative />
              <span className="account-details">
                <span className="account-name">{user.name}</span>
                <span className="account-role">{ROLE_LABEL[user.role]}</span>
              </span>
              <ChevronDown size={14} aria-hidden />
            </Button>
          }
        >
          <MenuGroup label={user.email}>
            <MenuItem icon={<KeyRound size={15} />} onSelect={onChangePassword}>
              Change password
            </MenuItem>
          </MenuGroup>
          <MenuSeparator />
          <MenuItem icon={<LogOut size={15} />} onSelect={() => void logout()}>
            Sign out
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
}
