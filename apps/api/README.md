# KhmerCraft API

The marketplace data lives in MongoDB. The frontend calls the API at the same
machine's port `3001`, so each developer must run this API locally while
developing.

## Share the same marketplace data with the team

1. Install dependencies from the repository root with `npm install`, then
   install the API dependencies with `cd apps/api && npm install`.
2. Create `apps/api/.env.local` from `.env.example`.
3. A project owner must share the team's **MongoDB connection string** and
   shared development `JWT_SECRET` through a private password manager or
   direct message. Put those values in `.env.local` only.
4. Start both applications from the repository root:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:4200`. The web app talks to that laptop's API at
   `http://localhost:3001`, and that API connects to the shared MongoDB
   database. Products, stores, accounts, and orders will then match the rest
   of the team.

`apps/api/.env.local` is intentionally ignored by Git. Never commit database,
email, OAuth, Telegram, or ABA credentials. A developer who uses the fallback
`mongodb://127.0.0.1:27017/khmer-craft` gets a separate empty database, which
is expected for offline work.

## Checks

```bash
cd apps/api
npm run build
npm test
```

For shared data, run the API first and confirm `http://localhost:3001/health`
returns `{ "status": "ok" }` before starting the web app.
