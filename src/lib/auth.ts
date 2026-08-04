/**
 * Lógica centralizada de acceso por rol.
 *
 * Menor número = mayor privilegio:
 * - 1 = SuperAdmin (acceso total)
 * - 2 = Editor
 * - 3 = Consulta
 */
export function checkRoleAccess(
  userPermisos: 1 | 2 | 3,
  requiredRole: 1 | 2 | 3
): boolean {
  return userPermisos <= requiredRole;
}
