import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import LoaderOverlay from "./LoaderOverlay.jsx";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin, adminLoading } = useAuth();

  if (loading || (requireAdmin && adminLoading)) {
    return <LoaderOverlay label="Checking your session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
