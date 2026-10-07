import { apiFetch } from "./client";

export interface Operator {
  id: number;
  full_name: string;
  premium_name: string | null;
  is_active: boolean;
}

export interface OperatorIn {
  full_name: string;
  premium_name?: string | null;
  is_active?: boolean;
}

export interface OperatorPatch {
  full_name?: string;
  premium_name?: string | null;
  is_active?: boolean;
}

export function listOperators(): Promise<Operator[]> {
  return apiFetch<Operator[]>("/api/operators");
}

export function fetchOperator(id: number): Promise<Operator> {
  return apiFetch<Operator>(`/api/operators/${id}`);
}

export function createOperator(payload: OperatorIn): Promise<Operator> {
  return apiFetch<Operator>("/api/operators", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOperator(
  id: number,
  payload: OperatorPatch,
): Promise<Operator> {
  return apiFetch<Operator>(`/api/operators/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deactivateOperator(id: number): Promise<Operator> {
  return apiFetch<Operator>(`/api/operators/${id}`, { method: "DELETE" });
}
