/*
 * Writes dist/web/browser/runtime-config.js from environment variables.
 *
 * Run after `ng build`. One Angular build can then be deployed to several
 * hosts — the marketplace and the seller portal are the same bundle served
 * from two origins — because every origin the app needs is read from
 * `window` at runtime instead of being compiled in.
 *
 *   KC_API_URL            where the Express API lives
 *   KC_MARKETPLACE_URL    the marketplace origin
 *   KC_SELLER_PORTAL_URL  the seller portal origin
 *
 * Any variable left unset is simply omitted, and the app falls back to
 * deriving that origin from window.location (see api.config.ts and
 * core/portal/portal.ts).
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'dist', 'web', 'browser');
if (!existsSync(OUT_DIR)) {
  console.error(`[runtime-config] ${OUT_DIR} does not exist — run "ng build" first.`);
  process.exit(1);
}

const MAPPING = {
  __KHMERCRAFT_API__: process.env.KC_API_URL,
  __KHMERCRAFT_MARKETPLACE__: process.env.KC_MARKETPLACE_URL,
  __KHMERCRAFT_SELLER_PORTAL__: process.env.KC_SELLER_PORTAL_URL,
};

const lines = ['/* Generated at build time — do not edit. */'];
for (const [global, value] of Object.entries(MAPPING)) {
  if (!value) continue;
  // Trailing slashes are stripped by the readers anyway; do it here too so
  // what lands in the file is exactly what the app will use.
  lines.push(`window.${global} = ${JSON.stringify(value.replace(/\/+$/, ''))};`);
}

const body = `${lines.join('\n')}\n`;
writeFileSync(join(OUT_DIR, 'runtime-config.js'), body);

console.log(
  lines.length === 1
    ? '[runtime-config] no KC_* variables set — the app will derive origins from window.location.'
    : `[runtime-config] wrote ${lines.length - 1} override(s):\n${lines.slice(1).map((l) => `  ${l}`).join('\n')}`,
);
