import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Route, Router, Routes } from '@angular/router';

/**
 * KhmerCraft runs as two sites built from one bundle:
 *
 *   Marketplace    where buyers shop          localhost:4200          khmercraft.com
 *   Seller portal  where sellers run a store  seller.localhost:4200   seller.khmercraft.com
 *
 * Which one a tab is showing is decided by the origin it was loaded from, so
 * the two never share a URL space: a buyer page opened on the seller origin is
 * sent to the marketplace, and a seller page opened on the marketplace is sent
 * to the seller portal.
 *
 * Both origins can be pinned at serve time without a rebuild, the same way
 * `window.__KHMERCRAFT_API__` pins the API (see api.config.ts):
 *
 *   <script>
 *     window.__KHMERCRAFT_MARKETPLACE__ = 'https://khmercraft.com';
 *     window.__KHMERCRAFT_SELLER_PORTAL__ = 'https://seller.khmercraft.com';
 *   </script>
 *
 * Without an override the seller portal is the `seller.` subdomain of
 * wherever the marketplace is — including in dev, where browsers resolve
 * `seller.localhost` to this machine, so the one `ng serve` on port 4200
 * serves both sites. Only a bare IP address (a phone on the LAN) cannot
 * have a subdomain; there the seller portal falls back to port 4300.
 */
declare global {
  interface Window {
    __KHMERCRAFT_MARKETPLACE__?: string;
    __KHMERCRAFT_SELLER_PORTAL__?: string;
  }
}

export const MARKETPLACE_DEV_PORT = '4200';
export const SELLER_PORTAL_DEV_PORT = '4300';
const SELLER_SUBDOMAIN = 'seller.';

const trimSlash = (value: string): string => value.replace(/\/+$/, '');

const currentLocation = (): Location | null =>
  typeof window === 'undefined' ? null : window.location;

const resolveOrigin = (side: 'marketplace' | 'seller'): string => {
  const override = side === 'seller'
    ? globalThis.window?.__KHMERCRAFT_SELLER_PORTAL__
    : globalThis.window?.__KHMERCRAFT_MARKETPLACE__;
  if (override) return trimSlash(override);

  const location = currentLocation();
  if (!location) return '';
  const { protocol, hostname, host } = location;

  // Already on a `seller.` host (seller.khmercraft.com, or seller.localhost:4200
  // in dev): the marketplace is the same host without the prefix.
  if (hostname.startsWith(SELLER_SUBDOMAIN)) {
    return side === 'seller' ? `${protocol}//${host}` : `${protocol}//${host.slice(SELLER_SUBDOMAIN.length)}`;
  }

  // An IP address cannot take a subdomain, so the two sites differ by port.
  if (/^[\d.]+$|^\[|:/.test(hostname)) {
    return `${protocol}//${hostname}:${side === 'seller' ? SELLER_PORTAL_DEV_PORT : MARKETPLACE_DEV_PORT}`;
  }
  return `${protocol}//${side === 'seller' ? SELLER_SUBDOMAIN + host.replace(/^www\./, '') : host}`;
};

export const MARKETPLACE_ORIGIN = resolveOrigin('marketplace');
export const SELLER_PORTAL_ORIGIN = resolveOrigin('seller');

/** True when this tab was loaded from the seller portal's origin. */
export function isSellerPortalHost(): boolean {
  const location = currentLocation();
  return Boolean(location && location.origin === SELLER_PORTAL_ORIGIN);
}

const withPath = (origin: string, path: string): string =>
  `${origin}${path.startsWith('/') ? path : `/${path}`}`;

/** Absolute link to a page on the seller portal, e.g. `sellerPortalUrl('/pricing')`. */
export const sellerPortalUrl = (path = '/'): string => withPath(SELLER_PORTAL_ORIGIN, path);

/** Absolute link to a page on the marketplace, e.g. `marketplaceUrl('/products')`. */
export const marketplaceUrl = (path = '/'): string => withPath(MARKETPLACE_ORIGIN, path);

// ------------------------------------------------------------------- routing

/** Which site a route belongs to. Shared routes (sign-in, legal, help) work on both. */
export type PortalSide = 'marketplace' | 'seller' | 'shared';

/**
 * The seller portal's public pages live at the root of its own origin
 * (`/pricing`, `/faq`…). The old marketplace URLs (`/become-a-seller/pricing`)
 * still work: on either origin they land on the clean seller-portal path.
 */
const LEGACY_SELLER_PATHS: Record<string, string> = {
  'become-a-seller': '/',
  'become-seller': '/',
  'become-a-seller/explore': '/explore',
  'become-a-seller/pricing': '/pricing',
  'become-a-seller/faq': '/faq',
  'become-a-seller/about': '/about',
  'become-a-seller/guide': '/guide',
};

/** Maps a marketplace-era seller URL to its seller-portal path, keeping the query string. */
export function sellerPortalPathFor(url: string): string {
  const [path, query] = url.split('?');
  const key = path.replace(/^\/+|\/+$/g, '');
  const mapped = LEGACY_SELLER_PATHS[key] ?? (path || '/');
  return query ? `${mapped}?${query}` : mapped;
}

/** Only matches when the tab is on the seller portal origin. */
export const sellerPortalHostMatch: CanMatchFn = () => isSellerPortalHost();

/** Leaves the SPA for the other origin. Returns false so the router stays put meanwhile. */
const leaveFor = (url: string): false => {
  if (typeof window !== 'undefined') window.location.assign(url);
  return false;
};

const boundaryGuard = (side: Exclude<PortalSide, 'shared'>): CanActivateFn => (_route, state) => {
  const onSellerHost = isSellerPortalHost();
  if (side === 'marketplace' && onSellerHost) return leaveFor(marketplaceUrl(state.url));
  if (side === 'seller' && !onSellerHost) return leaveFor(sellerPortalUrl(sellerPortalPathFor(state.url)));
  return true;
};

/**
 * Puts the origin check in front of every route of one side. Redirect routes
 * cannot carry guards and need none: wherever they point is guarded itself.
 */
export function onPortal(side: PortalSide, routes: Routes): Routes {
  if (side === 'shared') return routes;
  const guard = boundaryGuard(side);
  return routes.map((route): Route =>
    route.redirectTo !== undefined ? route : { ...route, canActivate: [guard, ...(route.canActivate ?? [])] },
  );
}

/**
 * Old `/become-a-seller/...` links: an in-app hop to the clean path on the
 * seller portal, or a jump to the seller portal from the marketplace.
 */
const legacySellerRedirect: CanActivateFn = (_route, state) => {
  const target = sellerPortalPathFor(state.url);
  return isSellerPortalHost() ? inject(Router).parseUrl(target) : leaveFor(sellerPortalUrl(target));
};

export const LEGACY_SELLER_ROUTES: Routes = Object.keys(LEGACY_SELLER_PATHS).map((path) => ({
  path,
  pathMatch: 'full',
  canActivate: [legacySellerRedirect],
  children: [],
}));
