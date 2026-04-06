export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  roleId: number;
  role: string;
  teamId?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type TokenClaims = {
  userId: string;
  role: string;
  permissions: string[];
};

const TOKEN_KEY = "crm_auth_token";
const USER_KEY = "crm_auth_user";

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const decodeTokenClaims = (token: string): TokenClaims | null => {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(parts[1])) as Partial<TokenClaims>;
    if (!payload.userId || !payload.role) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : []
    };
  } catch {
    return null;
  }
};

export const storeAuthSession = (token: string, user: AuthUser): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
