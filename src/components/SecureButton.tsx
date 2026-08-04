import { Button, type ButtonProps } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { checkRoleAccess } from "@/lib/auth";

interface SecureButtonProps extends ButtonProps {
  requiredRole?: 1 | 2 | 3;      // verificación por nivel de rol (retrocompat)
  requiredModulo?: string;         // verificación por módulo (nueva forma recomendada)
  hideWhenDisabled?: boolean;
  tooltipMessage?: string;
}

export function SecureButton({
  requiredRole,
  requiredModulo,
  hideWhenDisabled = false,
  tooltipMessage = "No tienes permisos para esta acción",
  children,
  ...props
}: SecureButtonProps) {
  const { user, canEdit } = useAuth();

  if (!user) {
    return hideWhenDisabled ? null : (
      <Button {...props} disabled aria-disabled="true">
        {children}
      </Button>
    );
  }

  // Determinar acceso: rol Y/O módulo
  let hasAccess = true;
  if (requiredRole !== undefined) {
    hasAccess = hasAccess && checkRoleAccess(user.permisos, requiredRole);
  }
  if (requiredModulo !== undefined) {
    hasAccess = hasAccess && canEdit(requiredModulo);
  }

  if (!hasAccess && hideWhenDisabled) {
    return null;
  }

  if (!hasAccess) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button {...props} disabled aria-disabled="true">
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <Button {...props}>{children}</Button>;
}

// Hook para usar en lógica condicional (retrocompat + nuevo)
export function useHasRole(requiredRole: 1 | 2 | 3): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return checkRoleAccess(user.permisos, requiredRole);
}

export function useHasModulo(clave: string): boolean {
  const { hasModulo } = useAuth();
  return hasModulo(clave);
}

export function useCanEdit(clave: string): boolean {
  const { canEdit } = useAuth();
  return canEdit(clave);
}
