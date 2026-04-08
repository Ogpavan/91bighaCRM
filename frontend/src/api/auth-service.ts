import type { AuthUser } from "@/lib/auth";
import { apiRequest } from "@/api/api";

type LoginResponse = {
  success: boolean;
  user: AuthUser;
  token: string;
};

export async function login(payload: { email: string; password: string }): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: payload
  });
}
