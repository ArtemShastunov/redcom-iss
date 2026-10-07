import { apiFetch } from "./client";

export type UserRole = "supervisor" | "head" | "admin";

export interface CurrentUser {
  id: number;
  login: string;
  full_name: string;
  role: UserRole;
}

export function login(login_: string, password: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ login: login_, password }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export function fetchMe(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/api/auth/me");
}
