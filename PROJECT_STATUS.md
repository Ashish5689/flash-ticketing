# Flash Ticketing Project Status

Use this document as the living implementation tracker for the system described in `DESIGN.md`.
When an item moves from "Partially Done" or "Left To Build" into a finished state, move it into
"Completed" and add a short note if useful.

Last updated: July 8, 2026

## Completed

- [x] Monorepo structure with `backend/`, `frontend/`, `loadtest/`, Docker Compose, CI, Render config, and README.
- [x] Backend scaffold using Node.js, Express, TypeScript, PostgreSQL, Redis/Upstash, WebSockets, Zod, Pino, and Stripe.
- [x] Raw SQL migration setup with the durable tables: users, events, ticket types, seats, orders, order items, and payments.
- [x] Seat-map event inventory for V1.
- [x] Organizer event creation and seat creation APIs.
- [x] Public event list and event detail APIs.
- [x] Redis seat holds using atomic `SET NX EX`.
- [x] Redis TTL-based hold expiry.
- [x] Hold ownership checks.
- [x] Early hold release endpoint.
- [x] Idempotent booking confirmation using `Idempotency-Key`.
- [x] PostgreSQL confirmation transaction that marks a seat sold and creates order, order item, and payment records.
- [x] Durable no-double-sale guard with unique `order_items.seat_id`.
- [x] Stripe test-mode backend payment integration.
- [x] Waiting-room queue join and queue status APIs.
- [x] Redis admission set for queue tokens.
- [x] In-process queue admission worker for Render free-tier compatibility.
- [x] WebSocket gateway attached to the Express HTTP server.
- [x] User-specific WebSocket pushes for hold creation, hold release, queue admission, and confirmation.
- [x] Clerk authentication integration for email/password and Google sign-in.
- [x] Backend role mapping through `ORGANIZER_EMAILS` and Clerk metadata.
- [x] React + Vite frontend with auth screen, event list, event detail, checkout, confirmation, and organizer dashboard.
- [x] Frontend API wrapper and hooks for auth, countdown, and WebSocket connection.
- [x] Docker Compose for local PostgreSQL and Redis.
- [x] Render deployment configuration for backend web service and frontend static site.
- [x] Backend deployed on Render and verified through `/health` and `/events`.
- [x] Frontend deployed on Render.
- [x] k6 reservation script added.
- [x] Backend tests for reservation correctness and idempotency basics.
- [x] GitHub CI for backend lint/test and frontend build.
- [x] Event-wide WebSocket subscriptions and live availability broadcasts.
- [x] Organizer live dashboard with realtime available, held, and sold counts.
- [x] Waiting-room realtime position, admission, and expiry messages with polling fallback.
- [x] Stripe Elements checkout with backend PaymentIntent creation and confirmation verification.
- [x] BookMyShow-style discovery polish with search, category filters, stronger event cards, and clearer event detail states.
- [x] Repeatable load-test guide and Postgres invariant checker.
- [x] Deployment hardening notes for Render, Clerk, Stripe, and CORS.
- [x] README portfolio updates with live demo links and final architecture notes.

## Partially Done
No partially-done items are currently active. Move future in-progress work here when it is started but not complete.

## Left To Build

- [ ] Advanced discovery filters: location/date sorting and richer category metadata.
- [ ] Advanced organizer metrics: revenue, conversion, and queue size.
- [ ] Integration test environment with real Postgres and Redis services in CI.
- [ ] More backend tests:
  - [ ] Auth and Clerk token validation behavior.
  - [ ] Organizer-only event and seat creation.
  - [ ] Held seat cannot be reserved by another user.
  - [ ] Release only works for hold owner.
  - [ ] Expired holds cannot be confirmed.
  - [ ] Queue token must be admitted before reserve.
  - [ ] Repeated confirm does not double-charge, double-order, or double-sell.
- [ ] Frontend flow tests for buyer and organizer journeys.
- [ ] Capture and commit measured k6 result numbers after running against local Docker services.
- [ ] Graceful shutdown polish for WebSocket drain and worker stop behavior.
- [ ] Rate limiting and bot-protection improvements around queue entry and reservation.
- [ ] Clerk production configuration and production keys after testing.
- [ ] Render Blueprint cleanup so backend and frontend deploy consistently from the repo.
- [ ] Add final screenshots or short demo GIFs to README.
- [ ] Optional future V2: general-admission inventory with Redis Lua decrement.
- [ ] Optional future V2: Redis pub/sub adapter for multi-instance WebSocket fan-out.
- [ ] Optional future V2: event partitioning/sharding strategy notes for scale.

## Operating Workflow

For future changes:

1. Start from `main`.
2. Create a branch before editing.
3. Implement the change.
4. Run the relevant local checks.
5. Commit as `Ashish Jha <ashisheduims@gmail.com>`.
6. Push the branch.
7. Open a pull request into `main`.
8. Merge only after the branch is reviewed/tested.
