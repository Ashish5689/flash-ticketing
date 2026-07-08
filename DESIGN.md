# Flash-Sale Ticketing System — Design Document

> A backend that sells a **limited pool of tickets to a huge burst of simultaneous buyers**
> (concert drops, IPL tickets, limited releases). The hard requirement: **never sell the same
> seat twice, and stay up when 50,000 people hit "Buy" in the same second.**

- **Stack:** Node.js + Express + TypeScript, PostgreSQL, Redis, WebSockets, Docker
- **Deploy:** Render (web service + static site) · Neon (Postgres) · Upstash (Redis) — all free tier
- **Author:** Ashish Jha

---

## Table of Contents
1. [What it does](#1-what-it-does)
2. [User roles & flows](#2-user-roles--flows)
3. [Request flow](#3-request-flow)
4. [System design — principles](#4-system-design--principles)
5. [Deep dives (the hard parts)](#5-deep-dives-the-hard-parts)
6. [Data model](#6-data-model)
7. [API design](#7-api-design)
8. [Folder structure](#8-folder-structure)
9. [Tech stack (all free)](#9-tech-stack-all-free)
10. [Deployment on Render](#10-deployment-on-render)
11. [Scalability roadmap](#11-scalability-roadmap)
12. [Non-functional requirements](#12-non-functional-requirements)
13. [Build phases](#13-build-phases)
14. [Interview talking points](#14-interview-talking-points)

---

## 1. What it does

A ticketing backend for high-demand events. The entire system exists to solve **three hard problems**:

1. **No overselling** under massive concurrency → **atomic reservation**.
2. **Fairness + survival** under a traffic spike → **virtual waiting room** (admission control).
3. **Exactly-once booking** despite retries / double-clicks / network glitches → **idempotency**.

Everything else (auth, browsing events, order history) is ordinary CRUD. The value — and the entire
interview story — lives in those three problems.

---

## 2. User roles & flows

### Organizer
- Creates an event (name, venue, datetime).
- Defines ticket inventory: total seats **or** a seat map + price tiers.
- Views a live sales dashboard (sold / held / available).

### Buyer
- Browses events and sees **live availability**.
- On a hot sale, enters a **virtual waiting room** and receives a queue position.
- When admitted, selects seat(s) → receives a **time-boxed hold** (e.g. 5 minutes).
- Completes payment within the hold window → **booking confirmed** → e-ticket issued.
- If payment doesn't complete in time, the hold **auto-expires** and the seat returns to the pool.

---

## 3. Request flow

```
 Buyer (React) ──► [1] Join sale ──► Waiting Room (Redis queue)
                                          │  admit in batches
                                          ▼
                   [2] GET availability ──► API (reads Redis cache)
                                          │
                   [3] POST /reserve ─────► API ──► Redis atomic hold (SET NX / Lua)
                                          │            └─ success → seat HELD (TTL 5m)
                                          │            └─ fail    → 409 "taken / sold out"
                                          ▼
                   [4] POST /confirm ─────► API ──► verify hold owner
                                          │      ──► payment (Stripe test mode)
                                          │      ──► Postgres TX: seat=SOLD + order row
                                          │      ──► publish "booking.confirmed" event
                                          ▼
                   [5] WebSocket push ────► "You're confirmed!" + e-ticket
```

**Key architectural decision:** a seat's *live* state (available / held) lives in **Redis** (fast,
atomic), while the *durable truth* (sold, orders, payments) lives in **PostgreSQL**. Redis is the hot
path that absorbs the spike; Postgres is the ledger you can never lose.

---

## 4. System design — principles

| Principle | How it shows up here |
|---|---|
| **Single source of truth per concern** | Redis = live availability; Postgres = durable orders/payments. Never two systems disagreeing about money. |
| **Atomicity over locking** | Reservation is one atomic Redis op, not read-check-write. No race window. |
| **Idempotency everywhere** | Every mutating endpoint takes an `Idempotency-Key`. Safe to retry. |
| **Fail-safe defaults** | Holds auto-expire via TTL — a crashed client can't lock a seat forever. |
| **Backpressure / admission control** | Waiting room caps how many users reach the booking path → protects the DB. |
| **Stateless services** | API holds no session state → any instance handles any request → horizontal scale. |
| **Event-driven side effects** | Confirmation email / analytics happen async, off the critical path. |
| **Graceful degradation** | If payment is slow, holds still expire cleanly; no seat is lost or double-sold. |

---

## 5. Deep dives (the hard parts)

### 5.1 Atomic seat reservation (no oversell)

**Wrong way (has a race):** `read seat → if available → write held`. Two requests both read
"available" before either writes → both succeed → **oversell**.

**Right way — one atomic op (seat-map events):**
```js
// Claim seat only if not already claimed. Atomic. 5-min hold.
const ok = await redis.set(`hold:${eventId}:${seatId}`, userId, 'NX', 'EX', 300);
if (!ok) return res.status(409).json({ error: 'Seat just taken' });
```

**General admission (N identical tickets)** — use a Lua script so "check remaining > 0 AND decrement"
is one indivisible operation:
```lua
-- reserve.lua : KEYS[1] = inventory:{eventId}:{ticketTypeId}
-- returns 1 if reserved, 0 if sold out
if tonumber(redis.call('GET', KEYS[1])) > 0 then
  redis.call('DECR', KEYS[1])
  return 1
else
  return 0
end
```
Redis executes Lua atomically → **impossible to oversell**, even at very high request rates.

### 5.2 Idempotent confirmation (exactly-once booking)

```
POST /confirm  { holdId, idempotencyKey, paymentToken }
```
1. Look up `idempotencyKey` in Redis. If seen → return the stored result (do **not** charge again).
2. Verify the caller owns the hold (`hold:{eventId}:{seatId} == userId`).
3. Run payment, then a **single Postgres transaction**: insert order + mark seat SOLD.
4. Store the result under the idempotency key (TTL 24h).

A double-clicking user or an auto-retrying client can call this 5 times → charged once, one ticket.

### 5.3 Virtual waiting room (survive the spike)

- All buyers first hit `POST /queue/join` → pushed onto a Redis sorted set, get a token + position.
- A controller admits users in **batches** (e.g. 500 every few seconds, tuned to sell rate).
- Only admitted tokens are accepted by `/reserve`.
- Buyers get WebSocket pushes: "You are #4,213 … now #900 … you're in!"
- **Why:** the DB and reservation path only ever see a controlled trickle, not the full stampede.
  This is **admission control / load shedding**.

### 5.4 Real-time updates
- WebSocket connection per active buyer for: queue position, hold countdown, confirmation.
- MVP may start with polling and upgrade to WebSockets.

---

## 6. Data model

### PostgreSQL (durable truth)
```sql
users(id, email, name, created_at)
events(id, name, venue, starts_at, status)                       -- draft|onsale|closed
ticket_types(id, event_id, name, price_cents, total_qty)         -- e.g. "VIP", "General"
seats(id, event_id, seat_label, ticket_type_id, status)          -- available|sold (seat-map events)
orders(id, user_id, event_id, amount_cents, status,
       idempotency_key UNIQUE, created_at)
order_items(id, order_id, seat_id | ticket_type_id, qty, price_cents)
payments(id, order_id, provider_ref, status, created_at)
```

### Redis (live / hot state)
```
inventory:{eventId}:{ticketTypeId}   → integer   (remaining count, GA)
hold:{eventId}:{seatId}              → userId    (TTL 300s, seat-map)
idem:{key}                           → result    (TTL 24h)
queue:{eventId}                      → sorted set (waiting room, score = join ts)
admitted:{eventId}                   → set of tokens allowed to reserve
ratelimit:{userId}                   → token-bucket counter
```

---

## 7. API design (REST)

```
POST   /auth/register | /auth/login                    → JWT
GET    /events                                          → list
GET    /events/:id                                      → detail + live availability (Redis-cached)
POST   /events                                          → (organizer) create
POST   /events/:id/queue/join                           → enter waiting room → {token, position}
GET    /events/:id/queue/status?token=                  → position / admitted?
POST   /reserve   {eventId, seatId, token}              → atomic hold → {holdId, expiresAt}
POST   /confirm   {holdId, idempotencyKey, payment}     → book → {orderId, ticket}
DELETE /reserve/:holdId                                 → release early
GET    /orders/:id                                      → order + e-ticket
WS     /ws                                              → queue position, hold timer, confirmation
```

---

## 8. Folder structure

Monorepo with a Node/Express (TypeScript) backend and a React (Vite) frontend.

```
flash-ticketing/
├── DESIGN.md                      # this document
├── README.md                      # quickstart + architecture diagram + load-test results
├── docker-compose.yml             # local Postgres + Redis
├── render.yaml                    # Render Blueprint (backend + frontend deploy)
├── .github/
│   └── workflows/
│       └── ci.yml                 # lint + test on push
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example               # DATABASE_URL, REDIS_URL, JWT_SECRET, STRIPE_SECRET_KEY
│   ├── migrations/                # SQL migrations (node-pg-migrate / drizzle-kit)
│   │   └── 001_init.sql
│   ├── src/
│   │   ├── server.ts              # app bootstrap, HTTP + WebSocket server
│   │   ├── app.ts                 # express app, middleware wiring
│   │   ├── config/
│   │   │   ├── env.ts             # typed env loading/validation
│   │   │   ├── db.ts              # Postgres pool
│   │   │   └── redis.ts           # Redis client + loaded Lua scripts
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT verification
│   │   │   ├── idempotency.ts     # Idempotency-Key handling
│   │   │   ├── rateLimit.ts       # Redis token-bucket
│   │   │   └── error.ts           # central error handler
│   │   ├── modules/
│   │   │   ├── auth/              # register/login, JWT issue
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.repo.ts
│   │   │   ├── events/            # event + inventory CRUD
│   │   │   │   ├── events.routes.ts
│   │   │   │   ├── events.service.ts
│   │   │   │   └── events.repo.ts
│   │   │   ├── reservation/       # ⭐ the hard part
│   │   │   │   ├── reservation.routes.ts
│   │   │   │   ├── reservation.service.ts   # SET NX + Lua reserve
│   │   │   │   └── scripts/reserve.lua
│   │   │   ├── booking/           # confirm + payment + order persistence
│   │   │   │   ├── booking.routes.ts
│   │   │   │   ├── booking.service.ts       # idempotent confirm, Postgres TX
│   │   │   │   └── payment.provider.ts      # Stripe test / mock
│   │   │   ├── queue/             # virtual waiting room
│   │   │   │   ├── queue.routes.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   └── admission.worker.ts      # batch admit loop
│   │   │   └── orders/            # order history, e-ticket
│   │   ├── ws/
│   │   │   └── gateway.ts         # WebSocket connection + push manager
│   │   ├── workers/
│   │   │   └── holdSweeper.ts     # (Redis TTL handles most; sweeper reconciles Postgres)
│   │   └── shared/
│   │       ├── logger.ts          # pino structured logs
│   │       ├── metrics.ts         # /metrics (prom-client)
│   │       └── errors.ts          # typed error classes
│   └── tests/
│       ├── reservation.test.ts    # concurrency / no-oversell tests
│       └── idempotency.test.ts
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.example               # VITE_API_URL
│   └── src/
│       ├── main.tsx
│       ├── api/                   # fetch wrappers
│       ├── hooks/                 # useWebSocket, useCountdown
│       ├── pages/
│       │   ├── EventList.tsx
│       │   ├── EventDetail.tsx    # seat map + availability
│       │   ├── WaitingRoom.tsx    # live queue position
│       │   ├── Checkout.tsx       # hold timer + payment
│       │   └── OrderConfirmation.tsx
│       └── components/
│
└── loadtest/
    └── reserve.js                 # k6 script — prove "N concurrent, 0 oversells"
```

**Why this layout:** feature-based `modules/` (not layer-based) keeps each concern —
reservation, booking, queue — self-contained, which mirrors how you'd later split them into
separate services. The `reservation` and `booking` modules are where the real engineering is.

---

## 9. Tech stack (all free)

| Layer | Tool | Notes |
|---|---|---|
| Backend | Node.js + Express + TypeScript | Core |
| Backend host | **Render Web Service** (free) | Supports WebSockets; sleeps after 15 min idle (cold start ~50s) |
| Frontend | React + Vite | |
| Frontend host | **Render Static Site** (free) or Vercel | |
| PostgreSQL | **Neon** (serverless, free) | No expiry — preferred over Render's free DB (deleted after 90 days) |
| Redis | **Upstash** (serverless, free) | Supports Lua + `SET NX` — the core of reservation logic |
| Payments | **Stripe test mode** (free) | Fake cards, real API flow. Or a mock provider for v1 |
| Auth | JWT (`jsonwebtoken`) | |
| Local dev | Docker + docker-compose | Postgres + Redis locally |
| CI/CD | GitHub Actions | Lint + test on push; Render auto-deploys on merge |
| Monitoring | Render logs + `pino`; UptimeRobot (free) keep-alive ping | |
| Error tracking | Sentry (free tier) | Optional |
| Load testing | **k6** (local) | ⭐ Produces the resume number: "N concurrent, 0 oversells, p95 = X ms" |

> ⚠️ **Render free-tier reality:** single instance, ~512 MB RAM, idle-sleep. You cannot truly
> load-test 50k users on it. Run k6 against a **local docker-compose** setup for headline numbers,
> and use Render for the always-available live demo link. Separating "demo env" from "load-test env"
> is a mature answer in interviews.

---

## 10. Deployment on Render

```
GitHub repo (monorepo)
├── /backend   → Render Web Service (Node)      ┐
├── /frontend  → Render Static Site (React)     ├─ auto-deploy on push to main
└── render.yaml (Blueprint defines both)        ┘

External free managed services:
  Neon    → DATABASE_URL
  Upstash → REDIS_URL
  Stripe  → STRIPE_SECRET_KEY (test)
```

**Steps**
1. Push repo to GitHub. Add `render.yaml` so both services deploy together.
2. Backend → Render **Web Service**: build `npm install && npm run build`, start `node dist/server.js`.
   Env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`.
3. Frontend → Render **Static Site**: build `npm run build`, publish `dist/`. Set `VITE_API_URL`.
4. Run DB migrations on deploy (Render pre-deploy command or one-off job).
5. Add UptimeRobot to ping `/health` every 5 min so the demo doesn't cold-start for recruiters.

**Queue worker note:** Render's free tier is web-service-only (no free background worker). For the MVP,
run the admission loop and hold-reconciliation sweeper as intervals **inside the web process**. When
scaling, split them into a dedicated Render Background Worker.

---

## 11. Scalability roadmap

Design single-instance now; know this growth path cold.

| Bottleneck | Scaling move |
|---|---|
| API throughput | Stateless services → run N instances behind a load balancer. No code change. |
| Redis hot path | Vertical scale first; then **Redis Cluster**, sharded **by `eventId`**. |
| DB writes on confirm | **Connection pooling** (PgBouncer) → **read replicas** for browse/availability → **shard by event**. |
| DB on critical path | **Write-behind**: settle in Redis instantly, async worker persists to Postgres. |
| Waiting room at scale | Swap Redis queue for **Kafka** — partitioned, replayable admission log. |
| WebSocket fan-out | **Redis pub/sub adapter** so a push on instance A reaches a socket on instance B; sticky sessions / dedicated WS tier. |
| Read-heavy availability | **CDN + edge cache** event pages; short-TTL availability cache. |
| Hot-event isolation | **Partition by event** end-to-end (bulkhead) so a viral drop can't take down other sales. |
| Abuse / bots | Rate limiting + queue tokens at the edge; CAPTCHA on queue entry. |

**One-liner:** *"Stateless behind the API, Redis absorbs the write spike with atomic ops, Postgres is
the durable ledger updated via write-behind, and the waiting room is admission control so downstream
never sees the full stampede. Every layer scales horizontally, and I partition by event so hot events
are isolated."*

---

## 12. Non-functional requirements

- **Security:** JWT auth, input validation (zod), parameterized SQL, secrets via env vars, HTTPS (Render default), rate limiting.
- **Observability:** structured JSON logs (pino), `/health` + `/metrics` (prom-client), request IDs.
- **Reliability:** hold TTLs, idempotency keys, DB transactions, graceful shutdown (drain WS on SIGTERM).
- **Testing:** unit tests for reservation/idempotency; a **concurrency test** that fires N parallel
  reserves at 1 seat and asserts exactly 1 success; k6 load test.
- **Correctness invariant:** *seats sold in Postgres ≤ total inventory, always.* This is the property
  the whole design protects.

---

## 13. Build phases

1. **Phase 1 — Core (resume-worthy alone):** events + seats CRUD, `POST /reserve` (atomic Redis hold),
   `POST /confirm` (idempotent + Postgres TX), auto-expiry. Local docker-compose.
   → Proves no-oversell + exactly-once.
2. **Phase 2 — Deploy:** Render + Neon + Upstash; live URL. Add Stripe test payments.
3. **Phase 3 — Waiting room + WebSockets:** batch admission, live queue position.
4. **Phase 4 — Prove it:** k6 load test → "N concurrent, 0 oversells, p95 = X ms" → resume + README.
5. **Phase 5 — Polish:** React seat-map UI, organizer dashboard, architecture diagram in README.

---

## 14. Interview talking points

- **"How do you prevent overselling?"** → single atomic Redis op (`SET NX` / Lua `DECR`); no
  read-then-write gap, so no race window. Postgres transaction is the durable commit.
- **"How is it exactly-once?"** → idempotency keys in Redis + unique constraint on `orders`, so retries
  and double-clicks never double-charge or double-book.
- **"How do you survive a spike?"** → virtual waiting room admits users in controlled batches
  (admission control), so the DB never sees the full stampede.
- **"What if a client crashes mid-booking?"** → the hold is a Redis key with a TTL; it auto-expires and
  the seat returns to the pool. No manual cleanup, no stuck inventory.
- **"How does it scale?"** → see §11 (stateless API, Redis cluster sharded by event, write-behind to
  Postgres, Kafka for the queue, partition by event).
- **"Redis vs Kafka here?"** → Redis for low-latency atomic reservation; Kafka for the replayable,
  partitioned admission log when the queue outgrows a single Redis instance.
