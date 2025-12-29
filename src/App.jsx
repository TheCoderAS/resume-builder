import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ResumeEditor from "./pages/ResumeEditor.jsx";
import TemplateGallery from "./pages/TemplateGallery.jsx";
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
        path="/app/templates"
        element={
          <ProtectedRoute>
            <TemplateGallery />
          </ProtectedRoute>
        }
      />
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
