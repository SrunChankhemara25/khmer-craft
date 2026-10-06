import { Request, Response, Router } from 'express';
import { env } from '../../config/env';
import { param } from '../../utils/request-params';
import { renderPreviewPage, renderUnavailablePage } from './share.render';
import { SharePreview, getProductSharePreview, getStoreSharePreview } from './share.service';

/**
 * Public, read-only share pages (GET only, no cookies or accounts involved).
 *   GET /api/share/product/:id
 *   GET /api/share/store/:idOrSlug[?category=…&sub=…]
 * Mounted at /api/share so the same path works behind the nginx gateway.
 */
const router = Router();

const send = (response: Response, preview: SharePreview | null) => {
  response.set('X-Robots-Tag', 'noindex');
  response.set('Referrer-Policy', 'no-referrer');
  response.type('html');
  if (!preview) {
    // 404 without saying why: missing, archived and unfinished all look alike.
    response.set('Cache-Control', 'public, max-age=60');
    response.status(404).send(renderUnavailablePage(env.webUrl));
    return;
  }
  // Short cache: a price or photo change shows up in new previews quickly.
  response.set('Cache-Control', 'public, max-age=300');
  response.send(renderPreviewPage(preview));
};

const text = (value: unknown) => (typeof value === 'string' ? value.slice(0, 80) : undefined);

router.get('/product/:id', async (request: Request, response: Response) => {
  send(response, await getProductSharePreview(param(request, 'id')));
});

router.get('/store/:idOrSlug', async (request: Request, response: Response) => {
  send(
    response,
    await getStoreSharePreview(
      param(request, 'idOrSlug'),
      text(request.query.category),
      text(request.query.sub),
    ),
  );
});

export default router;
