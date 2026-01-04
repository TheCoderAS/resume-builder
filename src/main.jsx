import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./firebase.js";
import { AuthProvider } from "./contexts/AuthContext.jsx";

const THEME_STORAGE_KEY = "resumiate-theme";
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
if (savedTheme === "light") {
  document.documentElement.classList.add("theme-light");
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
