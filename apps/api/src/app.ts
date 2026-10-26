import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import {
  isDocsEnabled,
  openApiDocument,
  swaggerUiOptions,
} from './docs/openapi';
import { errorHandler, notFound } from './middleware/error-handler';
import {
  apiRateLimit,
  preventOperatorInjection,
} from './middleware/security';
import { AppError } from './errors/app-error';
import authRoutes from './modules/auth/auth.routes';
import cartRoutes from './modules/cart/cart.routes';
import catalogRoutes from './modules/catalog/catalog.routes';
import orderRoutes from './modules/orders/orders.routes';
import sellerRoutes from './modules/sellers/sellers.routes';

export const createApp = () => {
  const app = express();

  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', true);

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, 'Origin is not allowed', 'CORS_REJECTED'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  // 100kb is ample for every JSON payload this API accepts; a larger ceiling
  // only widens the memory-exhaustion surface.
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use(preventOperatorInjection);
  app.use(apiRateLimit);

  app.get('/', (_request, response) => {
    response.json({ name: 'KhmerCraft API', status: 'ok' });
  });
  // Auth stays at /auth for backwards compatibility with the web client that
  // is already deployed against it; commerce is namespaced under /api.
  // TODO(api-prefix): fold /auth into /api/auth once the web client can be
  app.use('/auth', authRoutes);
  app.use('/api/sellers', sellerRoutes);
  app.use('/api/products', catalogRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);

  // Interactive API docs. Disabled in production so the schema is not public.
  if (isDocsEnabled) {
    app.get('/api-docs.json', (_request, response) => {
      response.json(openApiDocument);
    });
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(openApiDocument, swaggerUiOptions),
    );
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
