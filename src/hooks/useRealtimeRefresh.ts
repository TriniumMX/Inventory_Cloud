import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

interface DataChangedEvent {
  resource: string;
  action: "create" | "update" | "delete";
  id?: string | number;
}

/**
 * Vuelve a llamar `callback` cuando el backend avisa que `resource` cambió
 * en cualquier pantalla (propia o de otro usuario conectado). Un refetch
 * completo, sin parcheo de estado — consistente con el patrón manual
 * useState/useEffect que ya usa el resto de la app.
 */
export function useRealtimeRefresh(resource: string, callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (event: DataChangedEvent) => {
      if (event.resource === resource) callbackRef.current();
    };

    // AuthContext conecta el socket en su propio efecto de montaje, que en
    // React corre DESPUÉS del efecto de este hook (los hijos se montan antes
    // que el padre). Si aún no existe el socket, reintenta hasta engancharse.
    let attachedSocket: ReturnType<typeof getSocket> = null;
    const tryAttach = () => {
      const socket = getSocket();
      if (socket && socket !== attachedSocket) {
        attachedSocket?.off("data:changed", handler);
        socket.on("data:changed", handler);
        attachedSocket = socket;
      }
    };

    tryAttach();
    const interval = setInterval(tryAttach, 500);

    return () => {
      clearInterval(interval);
      attachedSocket?.off("data:changed", handler);
    };
  }, [resource]);
}
