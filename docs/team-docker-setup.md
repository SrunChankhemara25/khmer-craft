# Team Docker setup

Running `docker compose up` gives each laptop its own containers, but the
marketplace data is shared only when every API container uses the same cloud
MongoDB connection string.

## One-time setup on each teammate's laptop

1. Pull the latest code.
2. Copy the safe template:

   ```bash
   cp .env.docker.example .env.docker
   ```

3. The project owner shares the values for `MONGODB_URI` and `JWT_SECRET`
   privately. Add them to `.env.docker`. Do not send the file through GitHub,
   commit it, or paste its contents into chat.
4. Start the full application:

   ```bash
   docker compose up --build
   ```

5. Open `http://localhost`. The web, API, and the shared cloud data should
   now match across teammates.

## Why the included Mongo container is not enough

The `mongo` Docker service is useful for private offline development. It has a
different Docker volume on every laptop, so it is not suitable when the team
needs to see the same stores, products, orders, and accounts. Keep
`MONGODB_URI` pointed to the team's shared cloud database for collaboration.

## Quick check

After the containers start, open `http://localhost:3001/health`. A response
with `status: ok` confirms that the API is running. If the marketplace is
empty while another teammate sees data, verify that `.env.docker` contains the
shared database connection string and restart the API container.
