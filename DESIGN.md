# BookMyShow Clone — Design Document

> A full-stack movie & event ticketing platform (branded **"Book My Show"**) where users browse
> movies/shows, pick a cinema + showtime, select seats on a live seat map, and book tickets —
> with organizers managing theaters/shows and admins governing the platform.
>
> Core correctness guarantee (inherited from the flash-ticketing design): **never sell the same
> seat twice**, via atomic Redis holds + idempotent confirmation + Postgres as the durable ledger.

- **Project folder:** `movie-ticketing-platform` (product name: *Book My Show*)
- **Author:** Ashish Jha
- **Reference:** `~/Desktop/flash-ticketing/DESIGN.md` (concurrency/reservation design reused here)

---

## Table of Contents
1. [What it does](#1-what-it-does)
2. [Tech stack](#2-tech-stack)
3. [User roles & permissions](#3-user-roles--permissions)
4. [Authentication architecture](#4-authentication-architecture)
5. [Theming & design system](#5-theming--design-system)
6. [Data model](#6-data-model)
7. [Data flow](#7-data-flow)
8. [API design](#8-api-design)
9. [Folder structure](#9-folder-structure)
10. [Booking correctness (the hard part)](#10-booking-correctness-the-hard-part)
11. [Build phases](#11-build-phases)
12. [Non-functional requirements](#12-non-functional-requirements)
13. [Deployment](#13-deployment)

---

## 1. What it does

| Actor | Can do |
|---|---|
| **User** | Sign up (Google / email+password), browse movies & events by city, view showtimes per theater, pick seats on a seat map, hold seats (time-boxed), pay, get an e-ticket, see booking history. |
| **Organizer** | Register as a theater/show owner (admin-approved), create theaters → screens → seat layouts, list movies/shows, create showtimes with per-tier pricing, view sales dashboards. |
| **Admin** | Approve/reject organizers, manage the global movie catalog & categories, feature content on the home page, suspend users/organizers, view platform-wide analytics. |

The engineering core is the **booking pipeline**: seat map → atomic hold → idempotent confirm →
ticket. Everything else is well-structured CRUD around it.

---

## 2. Tech stack

Carried over from the flash-ticketing design, adjusted for this product:

| Layer | Tool | Notes |
|---|---|---|
| Frontend | **React + Vite + TypeScript** | SPA |
| Styling | **Tailwind CSS** | All colors/fonts/spacing via theme tokens — **zero hardcoded values in pages/components** (see §5) |
| State/data | React Query (server state) + Context/Zustand (auth, UI state) | |
| Routing | React Router | Role-guarded routes |
| Backend | **Node.js + Express + TypeScript** | REST API |
| Database | **PostgreSQL** (Neon free tier / local Docker) | Durable truth: users, theaters, shows, orders |
| Cache / hot state | **Redis** (Upstash free / local Docker) | Seat holds (TTL), idempotency keys, availability cache |
| Media | **Private AWS S3 + CloudFront OAC** | Admin-owned WebP posters/banners; S3 is never public |
| Auth | **Firebase Auth** (Google sign-in + email/password) → backend-issued **JWT** | Firebase Admin SDK verifies ID tokens; our JWT carries `role` (see §4) |
| Validation | zod (shared schemas where possible) | |
| ORM/migrations | Drizzle ORM + drizzle-kit (or node-pg-migrate) | Typed schema, SQL migrations |
| Payments | **Stripe hosted Checkout Sessions** (test mode) | Server-priced INR line items; no raw card data in app |
| Real-time | Polling first → WebSockets (seat map updates) later | |
| Local dev | Docker Compose (Postgres + Redis) | |
| CI/CD | GitHub Actions (lint + typecheck + test) | |
| Deploy | **AWS EC2** (Dockerized API) · **Vercel** (frontend) · Neon · Upstash · Firebase (auth only) | EC2 free tier (t3.micro, 12 mo) |
| Load test | k6 (local) — "N concurrent reserves, 0 oversells" | |

---

## 3. User roles & permissions

Single `users` table with a `role` enum: `USER` | `ORGANIZER` | `ADMIN`.

- Everyone registers as `USER` by default (via Google or email/password).
- A user can **apply to become an organizer** (business name, contact, docs) → admin approves →
  role upgraded to `ORGANIZER`.
- `ADMIN` is seeded via script/env (never self-service).

**Enforcement (backend is the source of truth):**
- `requireAuth` middleware → verifies JWT, attaches `req.user = { id, role }`.
- `requireRole('ADMIN')` / `requireRole('ORGANIZER')` guards on routes.
- Organizer routes additionally check **ownership** (an organizer can only mutate their own
  theaters/shows).
- Frontend route guards (`<ProtectedRoute role="...">`) are UX only, never security.

---

## 4. Authentication architecture

**Pattern: Firebase authenticates identity → our backend authorizes with its own JWT.**
Firebase knows nothing about roles; our Postgres + JWT do.

```
┌────────────┐  1. signInWithPopup(Google)            ┌──────────────┐
│  React app │ ───────────────────────────────────────►│ Firebase Auth│
│            │ ◄─────────────── 2. Firebase ID token ──│  (Google)    │
└─────┬──────┘                                          └──────────────┘
      │ 3. POST /auth/firebase  { idToken }
      ▼
┌────────────┐  4. Firebase Admin SDK verifies idToken
│  API (Node)│  5. Upsert user row (email, name, avatar, provider)
│            │  6. Sign OUR JWT: { sub: userId, role, email }  (+ refresh token)
└─────┬──────┘
      │ 7. { accessToken, user } + refresh token in httpOnly cookie
      ▼
  React stores access token in memory, refresh token in httpOnly cookie.
  Every API call: Authorization: Bearer <accessToken>.
```

- **Email/password** also goes through Firebase (`createUserWithEmailAndPassword` /
  `signInWithEmailAndPassword`) → same `POST /auth/firebase` exchange. One backend code path
  for both providers.
- **Our JWT**: short-lived access token (~15 min) + refresh token (httpOnly cookie,
  `POST /auth/refresh` rotates it). Access and refresh JWTs use separate secrets; refresh-session
  IDs are single-use records in Redis so replayed or revoked cookies are rejected.
- Role changes (organizer approval) take effect on next token refresh.
- Middleware never trusts the client-sent role — always from the verified JWT, which was signed
  from the DB value.

---

## 5. Theming & design system

**Rule: no raw colors, font names, or magic px values inside pages/components.** Everything comes
from Tailwind theme tokens defined once. Changing the brand = editing one file.

BookMyShow-inspired palette, defined as **semantic** CSS variables (in `src/styles/theme.css`)
consumed by `tailwind.config`:

| Token | Value (light) | Usage |
|---|---|---|
| `--color-brand` | `#F84464` (BMS red/pink) | Primary CTAs, active states, logo accent |
| `--color-brand-hover` | `#DC3558` | CTA hover |
| `--color-surface-dark` | `#1F2533` | Header/nav, footer (BMS dark navy) |
| `--color-surface` | `#FFFFFF` | Cards, sheets |
| `--color-bg` | `#F5F5F5` | Page background |
| `--color-text` | `#222539` | Primary text |
| `--color-text-muted` | `#6E7387` | Secondary text |
| `--color-seat-available` | outline gray-green | Seat map |
| `--color-seat-selected` | `#1EA83C` (green) | Seat map |
| `--color-seat-sold` | muted gray | Seat map |
| `--color-seat-bestseller` | amber | Seat map |
| Font | `Roboto` / system-ui stack | Set once as `font-sans` |

Usage in components is **only** `bg-brand`, `text-muted`, `bg-surface-dark`, `fill-seat-sold`,
etc. Shared UI primitives (`Button`, `Card`, `Badge`, `Input`, `Modal`) live in
`src/components/ui/` so pages compose primitives instead of restyling raw elements.
Dark mode later = swapping variable values, zero component changes.

---

## 6. Data model

### PostgreSQL (durable truth)

```sql
users(id, email UNIQUE, name, avatar_url, firebase_uid UNIQUE,
      provider,                        -- google | password
      role,                            -- USER | ORGANIZER | ADMIN
      status,                          -- active | suspended
      created_at)

organizer_profiles(id, user_id FK UNIQUE, business_name, phone, documents JSONB,
                   status, reviewed_by FK, reviewed_at, rejection_reason, -- pending|approved|rejected
                   created_at, updated_at)

theaters(id, organizer_id FK, name, city, address, status, created_at, updated_at)

screens(id, theater_id FK, name,                 -- "Screen 1", "IMAX"
        layout JSONB, created_at, updated_at)    -- rows[{label,seatCount,tier}], aisleAfterColumns[]

movies(id, title, description, poster_url, banner_url,
       poster_asset_key NULL, banner_asset_key NULL, -- managed S3 keys; legacy URLs remain valid
       genres TEXT[],
       languages TEXT[], duration_min, rating, release_date,
       certificate, status, created_at, updated_at, -- draft|published|archived
       created_by FK)                            -- admin-managed catalog

shows(id, movie_id FK, screen_id FK, starts_at, status,   -- scheduled|onsale|closed|cancelled
      created_at)                                          -- a "show" = one showtime

show_pricing(id, show_id FK, tier,               -- e.g. CLASSIC | PRIME | RECLINER
             price_cents)

show_seats(id, show_id FK, seat_label, tier, status)       -- available | sold  (per-show copy)

orders(id, user_id FK, show_id FK, amount_cents, status,   -- confirmed|cancelled
       idempotency_key UNIQUE, ticket_code UNIQUE, created_at)

order_items(id, order_id FK, show_seat_id FK, price_cents)

payments(id, order_id FK, provider, provider_ref, status, created_at)
```

### Redis (live / hot state)

```
hold:{showId}:{seatLabel}     → holdId:userId (TTL 300s — the seat hold)
booking-hold:{holdId}         → hold metadata (TTL 300s — ownership/recovery)
idem:{key}                    → result JSON   (TTL 24h — idempotent confirm)
avail:{showId}                → cached availability snapshot (short TTL)
ratelimit:{userId}            → token bucket
```

**Seat state at read time** = `show_seats.status` (Postgres) overlaid with live `hold:*` keys
(Redis). Sold is durable; held is ephemeral and auto-expires.

---

## 7. Data flow

### 7.1 Booking flow (the critical path)

```
User (React)
  │ 1. GET /shows/:id/seats            → seat map: sold (PG) + held (Redis) + available
  │ 2. select seats → POST /bookings/hold  { showId, seats[] }
  ▼
API:  for each seat → Redis SET hold:{showId}:{seat} userId NX EX 300   (all-or-nothing;
  │                    rollback holds already taken this request on any failure)
  │     → 200 { holdId, expiresAt }        → frontend starts 5:00 countdown
  │     → 409 { takenSeats }               → seat map refreshes, user re-picks
  ▼
  │ 3. POST /bookings/checkout-session { holdId } → Stripe-hosted Checkout
  │ 4. POST /bookings/confirm  { checkoutSessionId }
  ▼
API:  verify paid Stripe Checkout Session + hold ownership → idempotency check
  │     → Postgres TX: orders + order_items + show_seats.status='sold'
  │     → store result under idem key → release holds
  ▼
  │ 5. 200 { orderId, ticket }  → confirmation page + QR code
  │    (hold expiry with no confirm → TTL frees seats automatically)
```

### 7.2 Organizer flow

```
Apply (USER) → admin approves → role=ORGANIZER → re-login/refresh token
  → create theater → add screens (+ seat layout JSON) 
  → create show: pick movie + screen + time + tier pricing
  → publish → show_seats rows generated from screen.layout
  → dashboard: GET /organizer/shows/:id/stats  (sold/held/available, revenue)
```

### 7.3 Admin flow

```
Login (ADMIN) → dashboard
  → GET/PATCH /admin/organizers   (approve/reject applications)
  → CRUD /admin/movies            (global catalog)
  → upload/crop or HTTPS-import poster/banner → private S3 → CloudFront URL
  → PATCH /admin/users/:id        (suspend/activate)
  → GET /admin/stats              (platform totals)
```

---

## 8. API design (REST)

```
# Auth
POST   /auth/firebase                  { idToken } → { accessToken, user } + refresh cookie
POST   /auth/refresh                   → new access token
POST   /auth/logout
GET    /auth/me

# Public browse
GET    /movies?genre=&language=&q=
GET    /movies/:id                     → catalog detail (showtimes join in Phase 3)
GET    /shows/:id                      → showtime detail + pricing tiers
GET    /shows/:id/seats                → seat map with live availability

# User (auth: USER+)
POST   /bookings/hold                  { showId, seats[] } → { holdId, expiresAt }
GET    /bookings/hold/:holdId          → active hold summary for checkout recovery
DELETE /bookings/hold/:holdId          → release early
GET    /bookings/payment-config        → Stripe test-mode readiness
POST   /bookings/checkout-session      { holdId } → hosted Stripe Checkout URL
POST   /bookings/confirm               { checkoutSessionId } → { orderId, ticket }
GET    /bookings                       → my booking history
GET    /bookings/:orderId              → e-ticket (QR)
POST   /organizer/apply                → organizer application
GET    /organizer/application          → current application/status

# Organizer (auth: ORGANIZER)
GET    /organizer/theaters             POST /organizer/theaters
PATCH/DELETE /organizer/theaters/:id
POST   /organizer/theaters/:id/screens
PATCH/DELETE /organizer/screens/:id
POST   /organizer/shows                { movieId, screenId, startsAt, pricing[] }
PATCH  /organizer/shows/:id            (onsale/close/cancel)
GET    /organizer/shows/:id/stats

# Admin (auth: ADMIN)
GET    /admin/organizers?status=pending    PATCH /admin/organizers/:id  (approve/reject)
GET    /admin/movies?status=&genre=&language=&q=
POST/PATCH/DELETE /admin/movies
POST   /admin/media/images/upload      multipart { file, kind: poster|banner }
POST   /admin/media/images/import      { sourceUrl, kind: poster|banner }
DELETE /admin/media/images             { key } (unattached managed objects only)
GET    /admin/users                        PATCH /admin/users/:id       (suspend)
GET    /admin/stats
```

Conventions: JSON everywhere, zod-validated bodies, `Idempotency-Key` on mutating booking
endpoints, cursor pagination on lists, central error handler with typed error codes.

---

## 9. Folder structure

Monorepo: `frontend/` (React+Vite+TS+Tailwind) and `backend/` (Express+TS).

```
movie-ticketing-platform/
├── DESIGN.md                          # this document
├── MEMORY.md                          # phase tracker / session log — start here each session
├── README.md
├── infra/media-stack.yaml             # private S3 + CloudFront OAC + USD 5 budget
├── docker-compose.yml                 # local Postgres + Redis
├── .github/workflows/ci.yml
│
├── backend/
│   ├── package.json / tsconfig.json / Dockerfile / .env.example
│   ├── drizzle/                       # migrations
│   ├── src/
│   │   ├── server.ts                  # bootstrap (HTTP; WS later)
│   │   ├── app.ts                     # express app + middleware wiring
│   │   ├── config/                    # env.ts, db.ts, redis.ts, firebase.ts
│   │   ├── middleware/                # auth.ts (JWT), roles.ts, idempotency.ts,
│   │   │                              # rateLimit.ts, error.ts, validate.ts (zod)
│   │   ├── db/schema/                 # drizzle table definitions
│   │   ├── modules/
│   │   │   ├── auth/                  # firebase exchange, JWT issue/refresh
│   │   │   ├── movies/                # catalog browse + admin CRUD
│   │   │   ├── media/                 # image validation/import/normalization + S3 lifecycle
│   │   │   ├── theaters/              # theaters + screens + layouts (organizer)
│   │   │   ├── shows/                 # showtimes, pricing, seat generation
│   │   │   ├── booking/               # ⭐ hold (Redis NX) + confirm (idem + PG TX)
│   │   │   ├── orders/                # history, e-ticket
│   │   │   ├── organizer/             # application, dashboard stats
│   │   │   └── admin/                 # approvals, user mgmt, platform stats
│   │   └── shared/                    # logger, errors, types
│   └── tests/                         # booking concurrency + idempotency tests
│
└── frontend/
    ├── package.json / vite.config.ts / tsconfig.json / .env.example
    ├── tailwind.config.ts             # maps theme tokens → utilities
    └── src/
        ├── main.tsx / App.tsx / router.tsx
        ├── styles/theme.css           # ⭐ ALL design tokens (colors, fonts) live here
        ├── lib/                       # api client (fetch + auth header + refresh), firebase.ts
        ├── stores/                    # auth store
        ├── hooks/                     # useAuth, useCountdown, useSeatMap
        ├── components/
        │   ├── ui/                    # Button, Card, Input, Badge, Modal, Spinner
        │   ├── layout/                # Navbar (dark), Footer, CitySelector
        │   └── seatmap/               # SeatMap, Seat, TierLegend, HoldTimer
        └── pages/
            ├── Home.tsx               # banners + movie carousels
            ├── MovieList.tsx / MovieDetail.tsx
            ├── ShowSeats.tsx          # seat selection
            ├── Checkout.tsx           # hold timer + payment
            ├── OrderConfirmation.tsx  # QR ticket
            ├── MyBookings.tsx
            ├── auth/                  # Login, Register
            ├── organizer/             # Dashboard, Theaters, Screens, Shows, Stats
            └── admin/                 # Dashboard, Organizers, Movies, Users
```

---

## 10. Booking correctness (the hard part)

Inherited directly from the flash-ticketing design — see that document's §5 for full depth.

1. **No double-sell:** seat hold is one atomic Redis op per seat —
   `SET hold:{showId}:{seat} userId NX EX 300`. No read-then-write race. Multi-seat holds
   roll back already-acquired keys if any seat in the batch fails.
2. **Exactly-once confirm:** `Idempotency-Key` cached in Redis (24h) + `orders.idempotency_key
   UNIQUE` in Postgres. Retries/double-clicks → one charge, one ticket.
3. **Fail-safe expiry:** holds are TTL keys — crashed clients can't strand seats.
4. **Durable ledger:** confirm runs a single Postgres transaction (order + items + seats→sold).
   Redis is hot path; Postgres is truth about money.
5. **Test invariant:** N parallel holds on the same seat → exactly 1 succeeds (automated test +
   k6 script).

---

## 11. Build phases

> Progress is tracked in **MEMORY.md** — update it at the end of every session.

**Phase 0 — Scaffold & foundations**
Monorepo setup: Vite + React + TS + Tailwind (with the full token theme from §5), Express + TS,
docker-compose (Postgres + Redis), Drizzle + initial migration, env handling, CI skeleton,
shared UI primitives (Button, Card, Input, Navbar with BMS dark header). *Exit: both apps run;
theme demo page renders; DB migrates.*

**Phase 1 — Auth & roles**
Firebase project wiring (Google + email/password), `POST /auth/firebase` exchange, JWT
access/refresh, auth middleware + role guards, Login/Register pages, auth store + protected
routes, admin seed script. *Exit: can sign in with Google & email; `/auth/me` returns role;
role-gated route works.*

**Phase 2 — Catalog & organizer onboarding**
Admin: movie CRUD, organizer approval queue. User: apply-as-organizer. Organizer: theaters +
screens + seat-layout builder (JSON grid). Public: home page, movie list/detail with real data.
*Complete (2026-07-15): admin approval/role upgrade, ownership-scoped theater and screen CRUD,
validated tiered layouts, catalog seed, live verifier, and responsive browser QA all pass.*
*Media extension (2026-07-16): admin local crop and direct-URL import, private managed-object
lifecycle, legacy URL compatibility, and the versioned S3/CloudFront CloudFormation stack are
implemented and live in `ap-south-1`.*

**Phase 3 — Shows & seat map**
Organizer creates showtimes with tier pricing → `show_seats` generated from layout. Public
showtime picker (by city/theater/date). Read-only seat map UI rendering
available/sold/tiers from `GET /shows/:id/seats`. *Exit: browse movie → pick showtime → see
correct seat map. Complete (2026-07-16): transactional publication, indexed public discovery,
Redis hold overlay, organizer workspace, responsive seat map, live verifier, and browser QA pass.*

**Phase 4 — Booking pipeline ⭐**
Redis holds (atomic, multi-seat, rollback), hold countdown UI, idempotent confirm with mock
payment, Postgres TX, e-ticket page with QR, booking history, hold-release + expiry handling.
Concurrency test: N parallel holds → 1 winner. *Exit: full user journey works; oversell test
passes. Complete (2026-07-16): Redis Lua all-or-nothing holds, five-minute recoverable checkout,
idempotent mock confirmation, constrained Postgres ledger, QR tickets/history, release/TTL paths,
12-way live API race, and responsive browser QA pass.*

**Phase 5 — Dashboards & polish**
Organizer sales stats, admin platform stats, search/filters, empty/loading/error states
everywhere, responsive pass, Stripe test mode (replacing mock), rate limiting.
*Implementation complete (2026-07-16): organizer/admin dashboards, user suspension, dynamic
city/genre/language facets, Redis rate limits, Stripe-hosted Checkout Sessions, responsive states,
live verifier, and browser QA pass. Exit awaits a Stripe test secret and one real hosted-checkout
smoke test before the product is called demo-ready.*

**Phase 6 — Deploy & prove**
Backend → AWS EC2 (Docker + nginx origin behind CloudFront HTTPS), frontend → Vercel, Neon +
Upstash + Firebase prod config, cross-domain auth (CORS + `SameSite=None` refresh cookie),
migrations on deploy, GitHub Actions OIDC + SSM deploy workflow, k6 load test against local
Docker for the headline number, README with architecture diagram. The production template uses
no SSH ingress, IMDSv2, encrypted EBS/SSM configuration, a least-privilege instance role, and a
CloudFront-origin managed prefix list.
*Exit: live Vercel URL talking to the EC2 API over HTTPS + "N concurrent, 0 oversells" documented.*

**Phase 7 (stretch) — Real-time**
WebSocket seat-map updates (seat turns gray as someone else holds it), live organizer
dashboard.

---

## 12. Non-functional requirements

- **Security:** JWT (short-lived) + refresh rotation, Firebase ID token verified server-side,
  role checks + ownership checks on every mutating route, zod validation, parameterized SQL
  (Drizzle), rate limiting, secrets in env, CORS locked to frontend origin. Remote image imports
  require public HTTPS hosts, validate every redirect/DNS result, enforce time/byte/pixel limits,
  reject active/non-raster formats, strip metadata, and keep the S3 origin private behind OAC.
- **Correctness invariant:** *sold seats per show ≤ seats in layout, and never two orders for
  the same show_seat.* Protected by Redis NX + PG unique constraints + TX.
- **Observability:** pino structured logs, request IDs, `/health`.
- **Testing:** unit tests for booking service (concurrency, idempotency, hold expiry); happy-path
  integration test per role.
- **Code quality:** no hardcoded theme values, feature-based modules, shared zod schemas, typed
  errors, ESLint + Prettier in CI.

---

## 13. Deployment

Target: **backend on AWS EC2, frontend on Vercel** (managed data stays on free tiers):

```
GitHub monorepo
├── /backend   → AWS EC2 (Amazon Linux, Dockerized API behind nginx + CloudFront HTTPS)
│                env: DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
│                     CORS_ORIGIN, GOOGLE_APPLICATION_CREDENTIALS, AWS_S3_BUCKET,
│                     MEDIA_PUBLIC_BASE_URL, STRIPE_SECRET_KEY
├── /frontend  → Vercel (static build, SPA rewrite for React Router)
│                env: VITE_API_URL (https://api.<domain>), VITE_FIREBASE_* (public config)
├── /infra     → CloudFormation: private S3 + CloudFront OAC + AWS Budget
└── .github/workflows/deploy.yml    # GitHub OIDC → SSM pull, migrate, and replace on EC2

Neon → Postgres · Upstash → Redis · Firebase → Auth only
```

**EC2 specifics**
- t3.micro or t3.small; no SSH ingress. Systems Manager provides administration and deployments.
- Docker runs the API on loopback; host nginx proxies port 80. Only CloudFront's origin-facing
  managed prefix list can reach the origin, and CloudFront supplies the public TLS endpoint.
- `restart: unless-stopped` keeps the API alive across reboots. Each deployment pulls `main`, runs
  Drizzle migrations with a build-stage image, replaces the API container, and waits for `/health`.
- Option: run Postgres + Redis on the same instance via compose (one box, no external deps) —
  but no managed backups; Neon/Upstash recommended for the live demo.

**Cross-origin auth gotcha (Vercel ↔ EC2)**
Frontend and API live on different origins, so the refresh-token cookie must be
`Secure; SameSite=None`, and CORS must allow the exact Vercel origin **with credentials**.
Best: put both under one domain (`app.example.com` + `api.example.com`) so the cookie is
first-party and browser third-party-cookie blocking can't break token refresh. Budget time for
this — it's the most common deploy-time auth bug in this exact setup.
