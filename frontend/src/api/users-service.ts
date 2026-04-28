import { apiRequest } from "@/api/api";

export type UserItem = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  roleId: number;
  role: string;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
};

type UsersResponse = {
  success: boolean;
  items: UserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type UserResponse = {
  success: boolean;
  user: UserItem;
};

export type CreateUserPayload = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  roleName: string;
  teamId?: string;
  assignedProjects: string[];
  target?: number;
  commissionPercent?: number;
  isActive: boolean;
};

export async function getUsers(params?: { page?: number; limit?: number }): Promise<UsersResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  return apiRequest<UsersResponse>(`/api/v1/users?page=${page}&limit=${limit}`);
}

export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  const response = await apiRequest<UserResponse>("/api/v1/users", {
    method: "POST",
    body: payload
  });

  return response.user;
}

export async function disableUser(userId: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/api/v1/users/${userId}`, {
    method: "DELETE"
  });
}

export type UpdateUserPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  roleName?: string;
  teamId?: string;
  isActive?: boolean;
};

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<UserItem> {
  const response = await apiRequest<UserResponse>(`/api/v1/users/${userId}`, {
    method: "PUT",
    body: payload
  });

  return response.user;
}
