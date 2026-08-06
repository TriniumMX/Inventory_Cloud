import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { UsuarioAuth } from "@/lib/types";
import * as apiAuth from "@/lib/apiAuth";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface AuthContextType {
  user: UsuarioAuth | null;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (permisos: 1 | 2 | 3) => boolean;
  hasModulo: (clave: string) => boolean;
  canEdit: (clave: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth:user");
    if (stored) {
      try {
        const userData = JSON.parse(stored) as UsuarioAuth;
        // Fallback para sesiones antiguas sin modulosPermitidos
        if (!userData.modulosPermitidos) userData.modulosPermitidos = [];
        setUser(userData);
        connectSocket();
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("auth:user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (usuario: string, password: string) => {
    const { user: userData } = await apiAuth.login({ usuario, password });
    setUser(userData);
    localStorage.setItem("auth:user", JSON.stringify(userData));
    connectSocket();
  };

  const logout = () => {
    setUser(null);
    apiAuth.logout();
    disconnectSocket();
  };

  const hasRole = (permisos: 1 | 2 | 3): boolean => {
    if (!user) return false;
    return user.permisos <= permisos;
  };

  // Devuelve true si el usuario tiene acceso (ver) al módulo indicado
  const hasModulo = (clave: string): boolean => {
    if (!user) return false;
    if (user.permisos === 1) return true; // SuperAdmin siempre tiene acceso
    // Fallback para sesiones antiguas
    if (!user.modulosPermitidos) return user.permisos === 1;
    return user.modulosPermitidos.some((m) => m.clave === clave);
  };

  // Devuelve true si el usuario puede realizar acciones de escritura en el módulo
  const canEdit = (clave: string): boolean => {
    if (!user) return false;
    if (user.permisos === 1) return true; // SuperAdmin siempre puede editar
    if (!user.modulosPermitidos) return user.permisos === 1;
    const m = user.modulosPermitidos.find((p) => p.clave === clave);
    return m?.puedeEditar ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, hasModulo, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
