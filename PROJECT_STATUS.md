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

## Partially Done

- [ ] BookMyShow-style UI polish.
  Current state: the frontend has a better branded experience, but still needs richer event discovery, filters, card layouts, responsive polish, and a more production-grade ticketing flow.

- [ ] Live availability updates.
  Current state: user-specific WebSocket messages exist, but event-wide seat availability broadcasts are not yet complete.

- [ ] Organizer live dashboard.
  Current state: organizers can create inventory and see basic counts, but the dashboard does not yet receive rich live sales/hold updates.

- [ ] Waiting-room realtime experience.
  Current state: queue join, queue status, and admission exist. Queue position updates still rely mostly on polling and need stronger WebSocket updates/reconnect handling.

- [ ] Stripe frontend checkout.
  Current state: backend Stripe PaymentIntent flow exists, but the frontend still uses a simple payment method ID input instead of Stripe Elements or Payment Element.

- [ ] Load testing proof.
  Current state: a k6 script exists, but we still need a repeatable local load-test run, measured results, and a Postgres invariant checker after the run.

- [ ] Deployment hardening.
  Current state: Render deploy works, but CORS, Clerk production keys, env hygiene, and service naming still need final cleanup.

- [ ] README as final portfolio document.
  Current state: README has setup and architecture information, but still needs final deployed URLs, load-test results, screenshots, and final architecture notes.

## Left To Build

- [ ] Full event discovery experience: search, filters, categories, location/date sorting, and stronger event cards.
- [ ] Better seat-map UI with clearer states for available, held, sold, selected, and inaccessible seats.
- [ ] Event-wide WebSocket rooms/channels so all viewers receive live seat availability changes.
- [ ] Live organizer metrics: available, held, sold, revenue, conversion, and queue size.
- [ ] Stripe Elements or Payment Element checkout in the frontend.
- [ ] Robust queue UX: position movement, admitted state, expired token state, reconnect recovery, and user-friendly copy.
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
- [ ] k6 load-test result report with acceptance invariant:
  - [ ] Sold seats in Postgres never exceed total seats.
  - [ ] Each seat appears in at most one confirmed order.
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
