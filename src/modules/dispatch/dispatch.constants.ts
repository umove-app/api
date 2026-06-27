/**
 * Tunables for the dispatch engine. Kept in one place so dispatch behaviour
 * (radii, timeouts) can be adjusted without touching logic.
 */
export const DISPATCH = {
  /** Expanding search radius tiers, in kilometers. Tried in order. */
  RADIUS_TIERS_KM: [3, 6, 10, 15] as const,

  /** Max number of distinct drivers to offer an order to before giving up. */
  MAX_OFFERS: 8,

  /** How long (seconds) a single driver has to accept an offer before it
   *  expires and rolls to the next candidate. */
  OFFER_TTL_SECONDS: 25,

  /** TTL (seconds) on the accept lock. Must be >= OFFER_TTL so a held offer
   *  cannot be stolen by a concurrent accept from a non-offered driver. */
  ACCEPT_LOCK_TTL_SECONDS: 30,

  /** Redis key prefixes. */
  KEYS: {
    acceptLock: (orderId: string) => `dispatch:lock:order:${orderId}`,
    currentOffer: (orderId: string) => `dispatch:offer:order:${orderId}`,
    offeredSet: (orderId: string) => `dispatch:offered:order:${orderId}`,
    timer: (orderId: string) => `dispatch:timer:order:${orderId}`,
  },
} as const;
