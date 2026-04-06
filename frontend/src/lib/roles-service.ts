import { apiRequest } from "@/lib/api";

export type RoleItem = {
  id: string;
  name: string;
  slug?: string;
  user_count?: string;
};

export type PermissionItem = {
  key: string;
  description?: string | null;
};

type RolesResponse = {
  success: boolean;
  items: RoleItem[];
};

type RoleResponse = {
  success: boolean;
  role: RoleItem;
};

export async function getRoles(): Promise<RoleItem[]> {
  const response = await apiRequest<RolesResponse>("/api/v1/roles");
  return response.items;
}

export async function createRole(payload: { name: string }): Promise<RoleItem> {
  const response = await apiRequest<RoleResponse>("/api/v1/roles", {
    method: "POST",
    body: payload
  });

  return response.role;
}

export async function updateRole(roleId: string, payload: { name: string }): Promise<RoleItem> {
  const response = await apiRequest<RoleResponse>(`/api/v1/roles/${roleId}`, {
    method: "PUT",
    body: payload
  });

  return response.role;
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/api/v1/roles/${roleId}`, {
    method: "DELETE"
  });
}

type PermissionsResponse = {
  success: boolean;
  items: PermissionItem[];
};

type RolePermissionsResponse = {
  success: boolean;
  items: string[];
};

export async function getPermissions(): Promise<PermissionItem[]> {
  const response = await apiRequest<PermissionsResponse>("/api/v1/permissions");
  return response.items;
}

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const response = await apiRequest<RolePermissionsResponse>(`/api/v1/roles/${roleId}/permissions`);
  return response.items;
}

export async function updateRolePermissions(roleId: string, permissionKeys: string[]): Promise<string[]> {
  const response = await apiRequest<RolePermissionsResponse>(`/api/v1/roles/${roleId}/permissions`, {
    method: "PUT",
    body: { permissionKeys }
  });
  return response.items;
}
