import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "@/components/AuthContext";
import { AppSettingsProvider } from "@/components/AppSettingsContext";
import { ThemeProvider } from "@/components/ThemeContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AppSettingsProvider>
          <App />
        </AppSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
