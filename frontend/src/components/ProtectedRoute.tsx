import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import { useAppSettings } from "@/components/AppSettingsContext";
import type { AppSettings } from "@/api/settings-service";

type ProtectedRouteProps = {
  children: JSX.Element;
  permission?: string;
  featureKey?: keyof AppSettings;
};

export default function ProtectedRoute({ children, permission, featureKey }: ProtectedRouteProps) {
  const { token, hasPermission } = useAuth();
  const { isFeatureEnabled } = useAppSettings();

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  if (featureKey && !isFeatureEnabled(featureKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
