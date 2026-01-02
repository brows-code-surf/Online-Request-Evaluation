"use client";

import { useEffect } from "react";
import { initSocket, joinRoom } from "@/utils/socket";

export function useSocketMultiple(room, events) {
  useEffect(() => {
    const socket = initSocket();

    // Join room (same as Pusher channel)
    joinRoom(room);

    // Register each event listener
    Object.entries(events).forEach(([eventName, handler]) => {
      socket.on(eventName, handler);
    });

    // Cleanup listeners on unmount
    return () => {
      Object.entries(events).forEach(([eventName, handler]) => {
        socket.off(eventName, handler);
      });
    };
  }, [room, events]);
}
/**
 * Broadcast a request evaluation update using Socket.IO
 * @param {string} event - Event name ('request-approved', 'request-rejected', 'request-changed')
 * @param {object} data - Payload data
 */
export function broadcastRequestEvaluationUpdate(event, data) {
  const room = 'request-evaluation-broadcast';

  if (global.io) {
    global.io.to(room).emit(event, data);
    console.log(`Socket event sent => Room: ${room}, Event: ${event}`);
  } else {
    console.warn('Socket.IO server not initialized yet');
  }
}