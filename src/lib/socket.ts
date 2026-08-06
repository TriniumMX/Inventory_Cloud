import { io, Socket } from "socket.io-client";
import { API_URL, getToken } from "./apiClient";

let socket: Socket | null = null;

export function connectSocket(): Socket | null {
  const token = getToken();
  if (!token) return null;

  if (socket) {
    if (socket.connected) return socket;
    socket.disconnect();
  }

  socket = io(API_URL, { auth: { token } });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
