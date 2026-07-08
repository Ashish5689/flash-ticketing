# Flash Sale Ticketing System

A full-stack flash-sale ticketing system for high-demand events. The project demonstrates the core backend problems in a ticket drop: no overselling, admission control with a waiting room, idempotent booking confirmation, expiring seat holds, and live buyer updates.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL, recommended managed provider: Neon
- Hot path/cache: Redis, supports either Redis URL or Upstash REST URL/token
- Real time: WebSockets using `ws`
- Auth: Neon Auth with email/password and Google sign-in
- Payments: Stripe test mode
- Local infra option: Docker Compose
- Deployment: Render Web Service for backend, Render Static Site for frontend

## Project Structure

```text
flash-ticketing/
├── backend/              # Express API, migrations, tests
├── frontend/             # React + Vite app
├── loadtest/             # k6 reservation load test
├── docker-compose.yml    # Optional local Postgres + Redis
├── render.yaml           # Render blueprint
└── DESIGN.md             # System design notes
```

## Environment Files

Do not commit real `.env` files. This repo ignores `.env`, `.env.local`, and generated build folders.

Create local env files from examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend Env

Set these in `backend/.env` for local development, and in the Render backend Web Service environment for deployment:

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require

# Use one Redis configuration:
REDIS_URL=redis://localhost:6379

# Or Upstash REST:
UPSTASH_REDIS_REST_URL=https://example.upstash.io
UPSTASH_REDIS_REST_TOKEN=replace-me

JWT_SECRET=replace-with-a-long-random-secret
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
NEON_AUTH_JWKS_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json
ORGANIZER_EMAILS=organizer@example.com,admin@admin.com
CORS_ORIGIN=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
HOLD_TTL_SECONDS=300
QUEUE_ADMIT_BATCH_SIZE=25
QUEUE_ADMIT_INTERVAL_MS=3000
```

For Render, put backend variables in:

`Render Dashboard -> flash-ticketing-api -> Environment`

### Frontend Env

Set these in `frontend/.env` locally, and in the Render Static Site environment for deployment:

```bash
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
VITE_NEON_AUTH_URL=https://ep-xxx.neonauth.us-east-1.aws.neon.tech/neondb/auth
```

For Render, put frontend variables in:

`Render Dashboard -> flash-ticketing-web -> Environment`

Important: Vite env vars are baked into the frontend at build time. After changing frontend env vars in Render, redeploy the static site.

## Local Setup

Install dependencies:

```bash
npm --prefix backend install
npm --prefix frontend install
```

If using local Docker Postgres/Redis instead of Neon/Upstash:

```bash
docker compose up -d
```

Run migrations and seed demo data:

```bash
npm --prefix backend run migrate
npm --prefix backend run seed
```

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

Demo users after seeding:

```text
buyer@example.com / password123
organizer@example.com / password123
```

Use Stripe test payment method:

```text
pm_card_visa
```

## Main Flows

Buyer flow:

1. Log in with Neon Auth email/password or Google.
2. Open an event.
3. Join the waiting room.
4. Wait for admission.
5. Select an available seat.
6. Reserve the seat.
7. Confirm payment before the hold expires.

Organizer flow:

1. Log in as an organizer.
2. Create an event.
3. Add seat labels and inventory.
4. Watch sold, held, and available counts update.

## API Overview

```text
POST   /auth/register
POST   /auth/login
GET    /auth/me
GET    /events
GET    /events/:id
POST   /events
POST   /events/:id/seats
POST   /events/:id/queue/join
GET    /events/:id/queue/status?token=...
POST   /reserve
DELETE /reserve/:holdId
POST   /confirm
GET    /orders/:id
GET    /health
GET    /metrics
WS     /ws?token=JWT
```

## Correctness Model

- Seat holds use Redis `SET NX EX`, so only one buyer can hold a seat at a time.
- Holds expire automatically using Redis TTL.
- Booking confirmation requires an `Idempotency-Key`.
- Stripe receives the same idempotency key to avoid double charges.
- PostgreSQL marks the seat sold and inserts the order in one transaction.
- `order_items.seat_id` is unique, adding a durable no-double-sale guard.
- The waiting room limits how many users can hit the reservation path at once.

## Architecture

```mermaid
flowchart LR
  A["React + Vite"] --> B["Express API"]
  A <-->|"WebSocket"| C["WS Gateway"]
  B --> D["Redis or Upstash: queue + holds + idempotency"]
  B --> E["PostgreSQL or Neon: users/events/orders"]
  B --> F["Stripe test mode"]
  G["Admission interval"] --> D
  B --> C
```

## Testing

Backend tests:

```bash
npm --prefix backend test
```

Backend TypeScript build:

```bash
npm --prefix backend run build
```

Frontend production build:

```bash
npm --prefix frontend run build
```

Run all main checks:

```bash
npm --prefix backend test
npm --prefix backend run build
npm --prefix frontend run build
```

## Load Test

Install k6, create or seed an event, log in, join the queue, wait for admission, then run:

```bash
k6 run \
  -e API_URL=http://localhost:4000 \
  -e EVENT_ID=<event-id> \
  -e SEAT_ID=<seat-id> \
  -e AUTH_TOKEN=<jwt> \
  -e QUEUE_TOKEN=<admitted-token> \
  loadtest/reserve.js
```

The invariant to check: one seat produces at most one successful reservation and one confirmed order.

## Render Deployment

The included `render.yaml` defines:

- `flash-ticketing-api`: backend Web Service
- `flash-ticketing-web`: frontend Static Site

Backend Render service:

```text
Build command: npm ci && npm run build
Start command: npm run migrate && node dist/server.js
Root directory: backend
```

Set backend env vars in the backend service:

```text
DATABASE_URL
REDIS_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
JWT_SECRET
NEON_AUTH_BASE_URL
NEON_AUTH_JWKS_URL
ORGANIZER_EMAILS
CORS_ORIGIN
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
HOLD_TTL_SECONDS
QUEUE_ADMIT_BATCH_SIZE
QUEUE_ADMIT_INTERVAL_MS
```

Use either `REDIS_URL` or the two Upstash REST variables. With Upstash free tier, the REST URL/token path is usually easiest.

Frontend Render static site:

```text
Build command: npm ci && npm run build
Publish directory: dist
Root directory: frontend
```

Set frontend env vars in the frontend static site:

```text
VITE_API_URL=https://your-render-api.onrender.com
VITE_WS_URL=wss://your-render-api.onrender.com/ws
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_NEON_AUTH_URL=https://your-neon-auth-host/neondb/auth
```

Set backend `CORS_ORIGIN` to the frontend Render URL:

```text
https://your-render-static-site.onrender.com
```

Render free tier may sleep after inactivity. Use it for demos; run serious concurrency tests locally or in a dedicated load-test environment.

## GitHub Safety

Before pushing, verify secrets are not tracked:

```bash
git status --short
git check-ignore backend/.env frontend/.env
```

Only commit `.env.example` files. Real credentials belong in local `.env` files and Render environment variables.
