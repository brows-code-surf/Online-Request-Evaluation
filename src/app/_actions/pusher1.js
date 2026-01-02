'use server';

import { pusherServer } from '@/lib/pusher';

/**
 * Trigger a Pusher event to notify users
 * @param {string} channel - The channel to broadcast to (e.g., 'request-evaluation')
 * @param {string} event - The event name (e.g., 'new-request', 'request-updated')
 * @param {object} data - The data to send with the event
 */
export async function triggerPusherEvent(channel, event, data) {
  try {
    await pusherServer.trigger(channel, event, data);
    console.log(`Pusher event triggered: ${channel} -> ${event}`);
  } catch (error) {
    console.error('Error triggering Pusher event:', error);
    throw error;
  }
}

/**
 * Trigger an event for a specific user
 * @param {string} userName - The username to notify
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
export async function notifyUserUpdate(userName, event, data) {
  const channel = `user-${userName}`;
  await triggerPusherEvent(channel, event, data);
}

/**
 * Broadcast to all users in a specific feature/page
 * @param {string} feature - The feature name (e.g., 'request-evaluation', 'user-approval')
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
export async function broadcastFeatureUpdate(feature, event, data) {
  const channel = `${feature}-broadcast`;
  await triggerPusherEvent(channel, event, data);
}

/**
 * Notify multiple users about an update
 * @param {string[]} userNames - Array of usernames to notify
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
export async function notifyMultipleUsers(userNames, event, data) {
  try {
    const promises = userNames.map(userName => 
      notifyUserUpdate(userName, event, data)
    );
    await Promise.all(promises);
    console.log(`Notified ${userNames.length} users of event: ${event}`);
  } catch (error) {
    console.error('Error notifying multiple users:', error);
    throw error;
  }
}

/**
 * Trigger an event for request evaluation updates (legacy support)
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
export async function broadcastRequestEvaluationUpdate(event, data) {
  await broadcastFeatureUpdate('request-evaluation', event, data);
}

/**
 * Trigger an event for user approval updates
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
export async function broadcastUserApprovalUpdate(event, data) {
  await broadcastFeatureUpdate('user-approval', event, data);
}

/**
 * Trigger an event for user account updates
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
export async function broadcastUserAccountUpdate(event, data) {
  await broadcastFeatureUpdate('user-account', event, data);
}

/**
 * Trigger an event for user profile updates
 * @param {string} event - The event type
 * @param {object} data - The event data
 */
export async function broadcastUserProfileUpdate(event, data) {
  await broadcastFeatureUpdate('user-profile', event, data);
}
