import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db";

export interface AuthPayload {
  sub: string;
  id: number;
  usuario: string;
  nombre: string;
  permisos: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// Chequeo puntual de acceso a módulo (usado por requireModulo y por middlewares
// dinámicos que necesitan resolver la clave del módulo en tiempo de request,
// ej. activos, donde la misma tabla sirve a "bienes-muebles" y "enseres").
export async function hasModuloAccess(userId: number, clave: string, needsEdit: boolean): Promise<boolean> {
  const { rows } = await pool.query<{ puede_ver: boolean; puede_editar: boolean }>(
    `SELECT um.puede_ver, um.puede_editar
       FROM usuario_modulos um
       JOIN modulos m ON m.id_modulo = um.id_modulo
      WHERE um.id_usuario = $1 AND m.clave = $2`,
    [userId, clave]
  );
  if (rows.length === 0 || !rows[0].puede_ver) return false;
  if (needsEdit && !rows[0].puede_editar) return false;
  return true;
}

// Factory que genera middleware de protección por módulo.
// SuperAdmin (permisos === 1) siempre pasa; los demás se consultan en usuario_modulos.
export function requireModulo(clave: string, needsEdit = false) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    // SuperAdmin bypasses all module checks
    if (req.user.permisos === 1) {
      next();
      return;
    }

    try {
      const ok = await hasModuloAccess(req.user.id, clave, needsEdit);
      if (!ok) {
        res.status(403).json({ error: "Sin acceso al módulo" });
        return;
      }
      next();
    } catch (err) {
      console.error("[requireModulo] Error:", err);
      res.status(500).json({ error: "Error verificando permisos" });
    }
  };
}
