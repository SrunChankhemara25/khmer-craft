/*
 * Deploy-time configuration, loaded before the Angular bundle.
 *
 * Empty by default, which is what local development wants: api.config.ts and
 * core/portal/portal.ts both fall back to deriving everything from
 * window.location, so `localhost:4200` and `seller.localhost:4200` keep
 * working with no setup.
 *
 * A deployed build overwrites this file via scripts/write-runtime-config.mjs,
 * which fills it in from environment variables at build time. That is how one
 * Angular build can serve the marketplace and the seller portal from two
 * different hosts without being rebuilt for each.
 */
