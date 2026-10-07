import { apiFetch } from "./client";

export type UserRole = "supervisor" | "head" | "admin";

export interface User {
  id: number;
  login: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UserIn {
  login: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UserPatch {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export function listUsers(): Promise<User[]> {
  return apiFetch<User[]>("/api/users");
}

export function createUser(payload: UserIn): Promise<User> {
  return apiFetch<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(id: number, payload: UserPatch): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changePassword(id: number, newPassword: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}/password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export function deactivateUser(id: number): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, { method: "DELETE" });
}
