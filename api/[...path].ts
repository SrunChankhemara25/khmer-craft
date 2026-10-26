import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../apps/api/src/app';
import dbConnect, { ensureDatabaseCollections } from '../apps/api/lib/mongodb';

const app = createApp();
let databaseReady: Promise<void> | undefined;

const connectDatabase = () => {
  if (!databaseReady) {
    databaseReady = dbConnect().then(() => ensureDatabaseCollections());
  }
  return databaseReady;
};

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    await connectDatabase();
    app(request, response);
  } catch (error) {
    databaseReady = undefined;
    const message = error instanceof Error ? error.message : 'Database connection failed';
    response.statusCode = 503;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ message: 'KhmerCraft API is temporarily unavailable', detail: message }));
  }
}
