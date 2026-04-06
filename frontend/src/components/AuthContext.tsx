import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  clearAuthSession,
  decodeTokenClaims,
  getStoredToken,
  getStoredUser,
  storeAuthSession,
  type AuthUser
} from "@/lib/auth";

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  role: string | null;
  permissions: string[];
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  hasPermission: (permissionKey: string) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());

  const claims = token ? decodeTokenClaims(token) : null;
  const permissions = claims?.permissions || [];
  const role = claims?.role || user?.role || null;

  const setSession = (nextToken: string, nextUser: AuthUser) => {
    storeAuthSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      user,
      role,
      permissions,
      setSession,
      logout,
      hasPermission: (permissionKey: string) => permissions.includes(permissionKey)
    }),
    [permissions, role, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
