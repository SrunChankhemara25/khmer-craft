import { SharePreview } from './share.service';

/** Escapes text for HTML bodies AND attribute values (the page uses both). */
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const meta = (attr: 'property' | 'name', key: string, value: string | number | null | undefined) =>
  value === null || value === undefined || value === ''
    ? ''
    : `<meta ${attr}="${key}" content="${escapeHtml(String(value))}">`;

/**
 * The page link-preview crawlers (Telegram, Facebook, WhatsApp, Discord,
 * Slack…) read: they take the Open Graph tags and do not run scripts. A
 * person who opens the link is sent on to the real page by the meta refresh —
 * no inline script, so it also works under a strict Content-Security-Policy.
 */
export const renderPreviewPage = (preview: SharePreview) => {
  const { title, description, imageUrl, canonicalUrl, targetUrl } = preview;
  const target = escapeHtml(targetUrl);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | KhmerCraft</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${target}">
${meta('property', 'og:site_name', 'KhmerCraft')}
${meta('property', 'og:type', preview.kind === 'product' ? 'product' : 'website')}
${meta('property', 'og:title', title)}
${meta('property', 'og:description', description)}
${meta('property', 'og:url', canonicalUrl)}
${meta('property', 'og:image', imageUrl)}
${meta('property', 'og:image:alt', imageUrl ? title : null)}
${preview.price !== undefined ? meta('property', 'product:price:amount', preview.price.toFixed(2)) : ''}
${preview.price !== undefined ? meta('property', 'product:price:currency', 'USD') : ''}
${meta('name', 'description', description)}
${meta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary')}
${meta('name', 'twitter:title', title)}
${meta('name', 'twitter:description', description)}
${meta('name', 'twitter:image', imageUrl)}
<meta http-equiv="refresh" content="0;url=${target}">
</head>
<body style="font-family:system-ui,sans-serif;padding:24px;color:#241f19">
<p>Opening <a href="${target}">${escapeHtml(title)}</a> on KhmerCraft…</p>
</body>
</html>`;
};

/** One page for every "no" — missing, archived, unfinished — so links cannot be used to probe. */
export const renderUnavailablePage = (homeUrl: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link unavailable | KhmerCraft</title>
<meta name="robots" content="noindex">
</head>
<body style="font-family:system-ui,sans-serif;padding:24px;color:#241f19">
<h1 style="font-size:20px">This link is no longer available</h1>
<p>The item may have been removed or the store is not open yet.</p>
<p><a href="${escapeHtml(homeUrl)}">Browse KhmerCraft</a></p>
</body>
</html>`;
