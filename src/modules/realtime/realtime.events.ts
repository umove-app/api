/**
 * Canonical realtime (Socket.IO) event names.
 *
 * These MUST stay in sync with the mobile client's WS_EVENTS
 * (android-mobile/src/config/websocket.config.ts).
 */
export const REALTIME_EVENTS = {
  // Order lifecycle (server -> client)
  ORDER_CREATED: 'order:created',
  ORDER_OFFER: 'order:offer', // a specific driver is being offered an order
  ORDER_OFFER_EXPIRED: 'order:offer:expired',
  ORDER_ACCEPTED: 'order:accepted',
  ORDER_REJECTED: 'order:rejected',
  ORDER_STARTED: 'order:started',
  ORDER_ARRIVED: 'order:arrived',
  ORDER_STATUS: 'order:status', // generic status change
  ORDER_COMPLETED: 'order:completed',
  ORDER_CANCELLED: 'order:cancelled',
  ORDER_NO_DRIVERS: 'order:no_drivers', // dispatch exhausted with no driver

  // Driver (server -> client / client -> server)
  DRIVER_LOCATION_UPDATE: 'driver:location:update',
  DRIVER_STATUS_CHANGE: 'driver:status:change',

  // Customer (client -> server)
  CUSTOMER_LOCATION_UPDATE: 'customer:location:update',

  // Payment
  PAYMENT_SUCCESS: 'payment:success',
  PAYMENT_FAILED: 'payment:failed',
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/** Room helpers — single source of truth for room naming. */
export const ROOMS = {
  user: (userId: string) => `user:${userId}`,
  driver: (driverId: string) => `driver:${driverId}`,
  order: (orderId: string) => `order:${orderId}`,
};
