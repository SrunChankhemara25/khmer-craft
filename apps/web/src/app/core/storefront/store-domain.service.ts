import { inject, Injectable } from '@angular/core';
import { CanMatchFn, Route, UrlSegment } from '@angular/router';

/**
 * Extracts a store slug from the current hostname or URL search parameters.
 *
 * Supported patterns:
 * 1. Subdomains:
 *    - `seoul-2.localhost` -> `seoul-2`
 *    - `cloth-store.localhost:4200` -> `cloth-store`
 *    - `angkor-crafts.khmercraft.com` -> `angkor-crafts`
 *    - `angkor-crafts.khmercraft.local` -> `angkor-crafts`
 * 2. Testing / preview query parameter on primary domain:
 *    - `localhost:4200/?store=seoul-2` -> `seoul-2`
 *    - `khmercraft.local/?store=cloth-store` -> `cloth-store`
 */
export function detectStoreSlugFromHost(hostname?: string, search?: string): string | null {
  if (typeof window === 'undefined') return null;

  const host = (hostname ?? window.location.hostname ?? '').toLowerCase();
  const query = search ?? window.location.search ?? '';

  // Primary / root marketplace domains
  const primaryRoots = [
    'localhost',
    '127.0.0.1',
    'khmercraft.com',
    'www.khmercraft.com',
    'khmercraft.local',
    'www.khmercraft.local',
  ];

  // Vercel project domains such as `khmer-craft.vercel.app` and preview
  // URLs are marketplace origins, not store subdomains.
  const isVercelProjectHost = host === 'vercel.app' || host.endsWith('.vercel.app');

  // If on a primary root domain, check query parameter fallback (convenient for local dev & testing)
  if (primaryRoots.includes(host) || isVercelProjectHost) {
    if (query) {
      const params = new URLSearchParams(query);
      const storeParam = params.get('store');
      if (storeParam && storeParam.trim()) {
        return storeParam.trim();
      }
    }
    return null;
  }

  // Handle subdomain e.g. "seoul-2.localhost" or "cloth-store.khmercraft.com"
  const parts = host.split('.');
  if (parts.length >= 2) {
    const sub = parts[0];
    // `seller` is the seller portal's own origin (see core/portal/portal.ts), not a store.
    const reserved = ['www', 'api', 'admin', 'mail', 'staging', 'dev', 'test', 'dashboard', 'gateway', 'seller'];
    if (!reserved.includes(sub)) {
      return sub;
    }
  }

  return null;
}

/**
 * Returns true if the current page is being viewed on a dedicated store domain/subdomain.
 */
export function isStoreDomainActive(): boolean {
  return Boolean(detectStoreSlugFromHost());
}

/**
 * Angular route matcher guard.
 * When a visitor loads '/' on a store domain/subdomain, this matches and serves
 * the Storefront rather than the general marketplace homepage.
 */
export const storeDomainMatchGuard: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  return isStoreDomainActive();
};
