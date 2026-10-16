import { useMe } from "./useMe";

export function usePermissions() {
  const me = useMe();
  const role = me.data?.role;

  return {
    canManagePeriods: role === "head" || role === "admin",
    canManageOperators: role === "head" || role === "admin",
    canManageUsers: role === "admin",
    canEditEvaluations:
      role === "supervisor" || role === "head" || role === "admin",
    isOperator: role === "operator",
  };
}