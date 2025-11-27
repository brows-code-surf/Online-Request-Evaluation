/**
 * Server-side Socket.IO broadcasts
 * This file must only run on the server
 */

/**
 * Trigger a Socket.IO event in a specific room
 */
export function triggerSocketEvent(room, event, data) {
  if (!global.io) {
    console.warn("Socket.IO server not initialized yet");
    return;
  }
  global.io.to(room).emit(event, data);
  console.log(`[Socket.IO] Event sent => Room: ${room}, Event: ${event}`, data);
}

/**
 * Notify ONE user
 */
export function notifyUserUpdate(userName, event, data) {
  const room = `user-${userName}`;
  triggerSocketEvent(room, event, data);
}

/**
 * Broadcast to a feature
 */
export function broadcastFeatureUpdate(feature, event, data) {
  const room = `${feature}-broadcast`;
  triggerSocketEvent(room, event, data);
}

/**
 * Notify multiple users
 */
export function notifyMultipleUsers(userNames, event, data) {
  userNames.forEach((userName) => notifyUserUpdate(userName, event, data));
}

/**
 * Feature-specific shortcuts
 */
export function broadcastRequestEvaluationUpdate(event, data) {
  broadcastFeatureUpdate("request-evaluation", event, data);
}

export function broadcastUserApprovalUpdate(event, data) {
  broadcastFeatureUpdate("user-approval", event, data);
}

export function broadcastUserAccountUpdate(event, data) {
  broadcastFeatureUpdate("user-account", event, data);
}

export function broadcastUserProfileUpdate(event, data) {
  broadcastFeatureUpdate("user-profile", event, data);
}
