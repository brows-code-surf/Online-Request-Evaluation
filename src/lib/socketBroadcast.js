/**
 * Backend Socket.IO broadcast functions
 * Requires your merged server (global.io)
 */

export function broadcastRequestEvaluationUpdate(event, data) {
  const room = 'request-evaluation-broadcast';

  if (global.io) {
    global.io.to(room).emit(event, data);
    console.log(`[Socket.IO] Room: ${room} | Event: ${event}`, data);
  } else {
    console.warn('[Socket.IO] Server not initialized yet');
  }
}

export function broadcastUserApprovalUpdate(event, data) {
  const room = 'user-approval-broadcast';
  if (global.io) {
    global.io.to(room).emit(event, data);
    console.log(`[Socket.IO] Room: ${room} | Event: ${event}`, data);
  }
}

export function broadcastUserAccountUpdate(event, data) {
  const room = 'user-account-broadcast';
  if (global.io) {
    global.io.to(room).emit(event, data);
    console.log(`[Socket.IO] Room: ${room} | Event: ${event}`, data);
  }
}

export function broadcastUserProfileUpdate(event, data) {
  const room = 'user-profile-broadcast';
  if (global.io) {
    global.io.to(room).emit(event, data);
    console.log(`[Socket.IO] Room: ${room} | Event: ${event}`, data);
  }
}

export function notifyUserUpdate(userName, event, data) {
  const room = `user-${userName}`;
  if (global.io) {
    global.io.to(room).emit(event, data);
    console.log(`[Socket.IO] Room: ${room} | Event: ${event}`, data);
  }
}

export function notifyMultipleUsers(userNames, event, data) {
  userNames.forEach(userName => notifyUserUpdate(userName, event, data));
}
