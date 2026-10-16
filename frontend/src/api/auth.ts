import { apiFetch } from "./client";

export type UserRole = "supervisor" | "head" | "admin" | "operator";

export interface CurrentUser {
  id: number;
  login: string;
  full_name: string;
  role: UserRole;
  operator_id: number | null;
}

export interface ChangeCredentialsIn {
  current_password: string;
  new_login?: string | null;
  new_password?: string | null;
  new_password_confirm?: string | null;
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

export function changeCredentials(
  payload: ChangeCredentialsIn,
): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/api/auth/change-credentials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}