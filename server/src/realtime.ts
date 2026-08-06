import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer, allowedOrigins: string[]): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // Mismo criterio que requireAuth (server/src/middleware/auth.ts), aplicado
  // al handshake del socket en vez de a un header HTTP.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) { next(new Error("No autorizado")); return; }
    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      next();
    } catch {
      next(new Error("Token inválido o expirado"));
    }
  });

  return io;
}

// Notifica a todos los clientes conectados que un recurso cambió, para que
// recarguen su propia vista. Deliberadamente genérico (sin nada específico
// de Supabase) — la misma capa debe servir a un backend con otra base de
// datos el día que este repo se duplique para otro cliente.
export function emitChange(resource: string, action: "create" | "update" | "delete", id?: string | number): void {
  io?.emit("data:changed", { resource, action, id });
}
