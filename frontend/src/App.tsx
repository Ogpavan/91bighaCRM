import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import Dashboard from "@/pages/Dashboard";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import ForgotPassword from "@/pages/ForgotPassword";
import AllLeads from "@/pages/leads/AllLeads";
import AddLead from "@/pages/leads/AddLead";
import UploadLeads from "@/pages/leads/UploadLeads";
import LeadDetailPage from "@/pages/leads/LeadDetailPage";
import MyTasks from "@/pages/tasks/MyTasks";
import AllTasks from "@/pages/tasks/AllTasks";
import CreateTaskPage from "@/pages/tasks/CreateTaskPage";
import TaskDetailPage from "@/pages/tasks/TaskDetailPage";
import Users from "@/pages/teams/Users";
import CreateUser from "@/pages/teams/CreateUser";
import Teams from "@/pages/teams/Teams";
import ModulesPage from "@/pages/Modules";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Projects from "@/pages/projects/Projects";
import ProjectsEntityPage from "@/pages/projects/ProjectsEntityPage";

function RedirectIfAuthenticated({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <Router future={{ v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/signin"
          element={
            <RedirectIfAuthenticated>
              <SignIn />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthenticated>
              <SignUp />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RedirectIfAuthenticated>
              <ForgotPassword />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute permission="view_dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute permission="view_leads" featureKey="feature_leads">
                <AllLeads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads/create"
            element={
              <ProtectedRoute permission="create_leads" featureKey="feature_leads">
                <AddLead />
              </ProtectedRoute>
            }
          />
          <Route path="/leads/add" element={<Navigate to="/leads/create" replace />} />
          <Route
            path="/leads/:id/edit"
            element={
              <ProtectedRoute permission="edit_leads" featureKey="feature_leads">
                <AddLead />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads/:id"
            element={
              <ProtectedRoute permission="view_leads" featureKey="feature_leads">
                <LeadDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads/upload"
            element={
              <ProtectedRoute permission="create_leads" featureKey="feature_leads">
                <UploadLeads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/properties"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route path="/projects" element={<ProtectedRoute><ProjectsEntityPage /></ProtectedRoute>} />
          <Route
            path="/my-tasks"
            element={
              <ProtectedRoute permission="view_tasks" featureKey="feature_tasks">
                <MyTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute permission="view_tasks" featureKey="feature_tasks">
                <AllTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/create"
            element={
              <ProtectedRoute permission="create_tasks" featureKey="feature_tasks">
                <CreateTaskPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <ProtectedRoute permission="view_tasks" featureKey="feature_tasks">
                <TaskDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="/tasks/my" element={<Navigate to="/my-tasks" replace />} />
          <Route path="/tasks/all" element={<Navigate to="/tasks" replace />} />
          <Route
            path="/users"
            element={
              <ProtectedRoute permission="view_users" featureKey="feature_users">
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/create"
            element={
              <ProtectedRoute permission="manage_users" featureKey="feature_users">
                <CreateUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teams"
            element={
              <ProtectedRoute permission="view_users" featureKey="feature_teams">
                <Teams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/modules"
            element={
              <ProtectedRoute permission="manage_users">
                <ModulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute permission="view_reports" featureKey="feature_reports">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute permission="manage_settings">
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
