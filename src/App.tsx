import { Route, Routes } from "react-router-dom";
import { Toaster } from "component-lib/toaster";
import { AuthGate } from "./auth/AuthGate";
import { Backlog } from "./pages/Backlog";
import { Board } from "./pages/Board";
import { MyTasks } from "./pages/MyTasks";
import { NotFound } from "./pages/NotFound";
import { Projects } from "./pages/Projects";
import { Reports } from "./pages/Reports";
import { Sprints } from "./pages/Sprints";
import { TaskDetail } from "./pages/TaskDetail";
import { TeamSettings } from "./pages/TeamSettings";
import { WorkspaceOverview } from "./pages/WorkspaceOverview";

export default function App() {
  return (
    <>
      <AuthGate>
        <Routes>
          <Route path="/" element={<WorkspaceOverview />} />
          <Route path="/projects" element={<Projects />} />
          {/* A project's home is its backlog, rendered in place to avoid a redirect flash. */}
          <Route path="/projects/:slug" element={<Backlog />} />
          <Route path="/projects/:slug/backlog" element={<Backlog />} />
          <Route path="/projects/:slug/sprints" element={<Sprints />} />
          <Route path="/projects/:slug/board" element={<Board />} />
          <Route path="/projects/:slug/reports" element={<Reports />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/team" element={<TeamSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthGate>
      <Toaster position="bottom-right" />
    </>
  );
}
