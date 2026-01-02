import { useEffect, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher';

/**
 * Custom hook to subscribe to Pusher events
 * @param {string} channelName - The channel to subscribe to
 * @param {string} eventName - The event to listen for
 * @param {function} callback - Callback function when event is received
 */
export function usePusher(channelName, eventName, callback) {
  useEffect(() => {
    if (!channelName || !eventName || !callback) return;

    try {
      const channel = pusherClient.subscribe(channelName);

      channel.bind(eventName, (data) => {
        console.log(`Received event: ${eventName}`, data);
        callback(data);
      });

      return () => {
        channel.unbind(eventName);
        pusherClient.unsubscribe(channelName);
      };
    } catch (error) {
      console.error('Error setting up Pusher subscription:', error);
    }
  }, [channelName, eventName, callback]);
}

/**
 * Custom hook to subscribe to multiple events on the same channel
 * @param {string} channelName - The channel to subscribe to
 * @param {object} events - Object with event names as keys and callbacks as values
 */
export function usePusherMultiple(channelName, events) {
  useEffect(() => {
    if (!channelName || !events || Object.keys(events).length === 0) return;

    try {
      const channel = pusherClient.subscribe(channelName);

      Object.entries(events).forEach(([eventName, callback]) => {
        if (typeof callback === 'function') {
          channel.bind(eventName, (data) => {
            console.log(`Received event: ${eventName}`, data);
            callback(data);
          });
        }
      });

      return () => {
        Object.keys(events).forEach((eventName) => {
          channel.unbind(eventName);
        });
        pusherClient.unsubscribe(channelName);
      };
    } catch (error) {
      console.error('Error setting up Pusher subscription:', error);
    }
  }, [channelName, events]);
}
