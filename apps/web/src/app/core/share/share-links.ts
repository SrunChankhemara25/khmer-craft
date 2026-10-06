import { API_URL } from '../api/api.config';

/**
 * Shareable links for products and for a store's categories.
 *
 * These point at the API's /share pages, not straight at the Angular app: the
 * app is client-rendered, and the crawlers behind link previews (Telegram,
 * WhatsApp, Facebook…) do not run scripts, so only a server-rendered page can
 * give them a title, price and photo. A person who opens the link is sent on
 * to the real page by that same share page.
 */
const shareBase = () => new URL(`${API_URL}/share`, window.location.origin).href;

export const productShareUrl = (productId: string): string =>
  `${shareBase()}/product/${encodeURIComponent(productId)}`;

/** The whole store, or — with a category and optionally a sub-category — one part of it. */
export const storeShareUrl = (storeId: string, category?: string | null, sub?: string | null): string => {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (category && sub) query.set('sub', sub);
  const qs = query.toString();
  return `${shareBase()}/store/${encodeURIComponent(storeId)}${qs ? `?${qs}` : ''}`;
};

export const telegramShareUrl = (url: string, text: string): string =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

export const whatsappShareUrl = (url: string, text: string): string =>
  `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

export const facebookShareUrl = (url: string): string =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

/** Copies to the clipboard; falls back for browsers/contexts without the async API. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
};
