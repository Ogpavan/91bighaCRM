import { apiRequest } from "@/lib/api";

export type TeamItem = {
  id: string;
  name: string;
  description?: string | null;
};

type TeamsResponse = {
  success: boolean;
  items: TeamItem[];
};

export async function getTeams(): Promise<TeamItem[]> {
  const response = await apiRequest<TeamsResponse>("/api/v1/teams");
  return response.items;
}

type TeamResponse = {
  success: boolean;
  team: TeamItem;
};

export async function createTeam(payload: { name: string; description?: string }): Promise<TeamItem> {
  const response = await apiRequest<TeamResponse>("/api/v1/teams", {
    method: "POST",
    body: payload
  });

  return response.team;
}

export async function updateTeam(teamId: string, payload: { name?: string; description?: string }): Promise<TeamItem> {
  const response = await apiRequest<TeamResponse>(`/api/v1/teams/${teamId}`, {
    method: "PUT",
    body: payload
  });

  return response.team;
}

export async function deleteTeam(teamId: string): Promise<void> {
  await apiRequest<{ success: boolean; message: string }>(`/api/v1/teams/${teamId}`, {
    method: "DELETE"
  });
}

type TeamPermissionsResponse = {
  success: boolean;
  items: string[];
};

export async function getTeamPermissions(teamId: string): Promise<string[]> {
  const response = await apiRequest<TeamPermissionsResponse>(`/api/v1/teams/${teamId}/permissions`);
  return response.items;
}

export async function updateTeamPermissions(teamId: string, permissionKeys: string[]): Promise<string[]> {
  const response = await apiRequest<TeamPermissionsResponse>(`/api/v1/teams/${teamId}/permissions`, {
    method: "PUT",
    body: { permissionKeys }
  });

  return response.items;
}
