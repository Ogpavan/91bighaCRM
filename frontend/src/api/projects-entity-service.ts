import { apiRequest } from "@/api/api";

export type ProjectEntity = {
  id: string;
  projectCode: string;
  name: string;
  slug: string;
  location: string | null;
  status: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  propertiesCount: number;
};

export type CreateProjectEntityPayload = {
  name: string;
  location?: string;
  status?: string;
  description?: string;
};

type ProjectsEntityResponse = {
  success: boolean;
  items: ProjectEntity[];
};

type ProjectEntityResponse = {
  success: boolean;
  project: ProjectEntity;
};

export async function getProjectsEntity() {
  const response = await apiRequest<ProjectsEntityResponse>("/api/v1/projects");
  return response.items;
}

export async function createProjectEntity(payload: CreateProjectEntityPayload) {
  const response = await apiRequest<ProjectEntityResponse>("/api/v1/projects", {
    method: "POST",
    body: payload
  });
  return response.project;
}
