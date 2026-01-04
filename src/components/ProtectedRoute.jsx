import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import LoaderOverlay from "./LoaderOverlay.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoaderOverlay label="Checking your session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
