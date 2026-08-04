import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AccesoDenegado } from "@/components/AccesoDenegado";
import { Loader2 } from "lucide-react";
import { checkRoleAccess } from "@/lib/auth";

interface ProtectedPageProps {
  children: React.ReactNode;
  requiredRole?: 1 | 2 | 3;
  requiredModulo?: string;  // clave del módulo, ej. 'almacen'
}

export function ProtectedPage({ children, requiredRole, requiredModulo }: ProtectedPageProps) {
  const { user, loading, hasModulo } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Verificación por rol (para páginas SuperAdmin): redirige a /forbidden
  if (requiredRole !== undefined) {
    if (!checkRoleAccess(user.permisos, requiredRole)) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  // Verificación por módulo: muestra componente inline, no redirige
  if (requiredModulo !== undefined) {
    if (!hasModulo(requiredModulo)) {
      return (
        <div className="flex flex-col h-full">
          <AccesoDenegado />
        </div>
      );
    }
  }

  return <>{children}</>;
}
