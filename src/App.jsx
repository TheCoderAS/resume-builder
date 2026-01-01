import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ResumeEditor from "./pages/ResumeEditor.jsx";
import Drafts from "./pages/Drafts.jsx";
import TemplateGallery from "./pages/TemplateGallery.jsx";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import ExportPublish from "./pages/ExportPublish.jsx";
import PublicResume from "./pages/PublicResume.jsx";
import AdminTemplates from "./pages/AdminTemplates.jsx";
import Profile from "./pages/Profile.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import useAnalyticsPageView from "./hooks/useAnalyticsPageView.js";

function AppRoutes() {
  useAnalyticsPageView();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/resume"
        element={
          <ProtectedRoute>
            <ResumeEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/drafts"
        element={
          <ProtectedRoute>
            <Drafts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/templates"
        element={
          <ProtectedRoute>
            <TemplateGallery />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/template-builder"
        element={
          <ProtectedRoute>
            <TemplateBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin/templates"
        element={
          <ProtectedRoute requireAdmin>
            <AdminTemplates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/export"
        element={
          <ProtectedRoute>
            <ExportPublish />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/r/:slug" element={<PublicResume />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
