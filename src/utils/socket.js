import { io } from "socket.io-client";

let socket;

export function initSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ["websocket"],
    });
  }
  return socket;
}

export function joinRoom(room) {
  const socket = initSocket();
  socket.emit("join", room);
}
