import { apiFetch } from "./client";

export interface Operator {
  id: number;
  full_name: string;
  premium_name: string | null;
  is_active: boolean;
  account_id: number | null;
  account_login: string | null;
  account_active: boolean | null;
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

export interface OperatorAccountIn {
  login?: string | null;
  password: string;
}

export interface OperatorAccountOut {
  user_id: number;
  login: string;
  is_active: boolean;
  operator_id: number;
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

export function createOperatorAccount(
  operatorId: number,
  payload: OperatorAccountIn,
): Promise<OperatorAccountOut> {
  return apiFetch<OperatorAccountOut>(`/api/operators/${operatorId}/account`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetOperatorPassword(
  operatorId: number,
  payload: OperatorAccountIn,
): Promise<OperatorAccountOut> {
  return apiFetch<OperatorAccountOut>(
    `/api/operators/${operatorId}/account/reset-password`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function deactivateOperatorAccount(operatorId: number): Promise<void> {
  return apiFetch<void>(`/api/operators/${operatorId}/account`, {
    method: "DELETE",
  });
}