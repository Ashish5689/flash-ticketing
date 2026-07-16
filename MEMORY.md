# MEMORY.md — Project Progress Tracker

> **Start every session here.** This file is the single source of truth for where we left off.
> At the end of every working session: update phase/task checkboxes, set **Current focus**,
> and add a dated entry to the **Session log**. Full plan & architecture live in `DESIGN.md`.

---

## Current focus

- **Active phase:** Phase 6 deployed; final evidence/polish
- **Next action:** Run the optional dedicated k6 profile and complete one Stripe-hosted checkout
  smoke test after a valid Stripe test secret is configured.
- **Blockers:** Phase 5's real Stripe-hosted checkout smoke test still needs a valid Stripe test
  secret. Security follow-up: revoke the AWS access key disclosed in chat and rotate any previously
  exposed Neon/Upstash credentials, then update their managed secret values.

---

## Phase status

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

### Phase 0 — Scaffold & foundations `[x]`
- [x] Monorepo layout (`frontend/`, `backend/`) per DESIGN.md §9
- [x] Frontend: Vite + React + TS + Tailwind installed
- [x] Theme tokens in `frontend/src/styles/theme.css` + `tailwind.config.ts` mapping (DESIGN.md §5 — no hardcoded colors/fonts anywhere)
- [x] Shared UI primitives: Button, Card, Input, Badge, Modal, Spinner
- [x] Layout: Navbar (BMS dark header) + Footer
- [x] Backend: Express + TS, app/server split, config/env loading (zod-validated)
- [x] docker-compose: Postgres + Redis running locally
- [x] Drizzle ORM + initial migration (users table minimum)
- [x] pino logger, central error handler, `/health`
- [x] ESLint + Prettier + GitHub Actions CI skeleton
- **Exit achieved:** both apps run; responsive theme demo renders; DB migration applies.

### Phase 1 — Auth & roles `[x]`
- [x] Firebase project created (`movie-ticket-e74a9`); Google + Email/Password providers enabled; service-account key downloaded (see "External services" below)
- [x] Frontend `lib/firebase.ts` (signInWithPopup, email/password flows)
- [x] `POST /auth/firebase` — verify ID token (Admin SDK), upsert user, issue JWT
- [x] Access token (15m) + refresh token (httpOnly cookie) + `POST /auth/refresh`
- [x] `requireAuth` + `requireRole` middleware
- [x] Login / Register pages; auth store; `<ProtectedRoute role>` guards
- [x] Admin seed script
- **Exit achieved:** Firebase email sign-in was verified end to end against the development
  services; Google uses the same verified exchange path and its popup UI is wired. `/auth/me`,
  rotating refresh cookies, replay rejection, logout, and role-gated frontend/backend paths pass.

### Phase 2 — Catalog & organizer onboarding `[x]`
- [x] Admin: movie CRUD (title, poster, genres, languages, duration, rating)
- [x] User: `POST /organizer/apply` + apply/resubmit/status page
- [x] Admin: organizer approval queue (transactional approval → role upgrade)
- [x] Organizer: ownership-scoped theater CRUD, screen CRUD + seat-layout builder (JSON rows,
  tiers, aisles, and live preview)
- [x] Public: Home page, MovieList, MovieDetail, search and language/genre filters with live data
- [x] Admin media extension: device upload with fixed poster/banner crop, direct HTTPS import,
  WebP normalization, managed-object rollback/replacement/removal, and legacy URL compatibility
- **Exit achieved:** the live verifier approves an organizer, confirms role enforcement, and
  creates an owned theater with a validated tiered screen layout.

### Phase 3 — Shows & seat map `[x]`
- [x] Organizer: create show (movie + screen + time + tier pricing)
- [x] `show_seats` generation from screen layout on publish
- [x] Public: showtime picker (city / theater / date)
- [x] `GET /shows/:id/seats` (PG sold + Redis held overlay)
- [x] Read-only SeatMap component (tiers, legend, sold/available states)
- **Exit:** browse movie → pick showtime → correct seat map renders.

### Phase 4 — Booking pipeline ⭐ `[x]`
- [x] `POST /bookings/hold` — atomic Redis NX multi-seat hold with rollback
- [x] Seat selection UI → hold → Checkout with 5:00 countdown
- [x] `POST /bookings/confirm` — idempotency key + mock payment + Postgres TX
- [x] `DELETE /bookings/hold/:id` + expiry handling (TTL)
- [x] OrderConfirmation page with QR e-ticket; MyBookings history
- [x] Concurrency test: N parallel holds on 1 seat → exactly 1 success
- **Exit achieved:** full booking journey works; automated and live oversell tests pass.

### Phase 5 — Dashboards & polish `[~]`
- [x] Organizer stats (sold/held/available, revenue per show)
- [x] Admin platform stats + user suspend
- [x] Search + filters (genre, language, city)
- [x] Loading/empty/error states; responsive pass
- [~] Stripe test mode replaces mock payment — integration complete; test key/live smoke pending
- [x] Rate limiting
- **Exit pending:** configure Stripe test credentials and complete one hosted-checkout smoke test.

### Phase 6 — Deploy & prove `[~]`
- [x] Replace `Ashish5689/flash-ticketing` `main` with a clean, secret-scanned history of this workspace
- [x] Frontend → **Vercel**: public production build at `https://flash-ticketing-neon.vercel.app`
- [x] Backend → **AWS EC2**: Docker/nginx API at `https://dro7vidljm1jc.cloudfront.net`
- [x] EC2 hardening: no SSH, CloudFront-only origin, IMDSv2, encrypted gp3, termination protection, least-privilege role, SSM administration
- [x] Neon + Upstash + Firebase production config; migrations run on every deploy
- [x] Cross-domain auth: exact public Vercel CORS origin, credential support, and Firebase authorized domain
- [x] GitHub Actions deploy workflow uses OIDC + SSM; AWS role and repository variables configured
- [~] Load proof: 12-way live booking race passes with one winner/zero oversells; dedicated k6 profile remains optional
- [x] README/infra runbook: reproducible deployment and live URLs documented
- **Exit achieved:** Vercel talks to the EC2 API over HTTPS and the booking concurrency invariant is proven.

### Phase 7 — Real-time (stretch) `[ ]`
- [ ] WebSocket gateway; live seat-map updates
- [ ] Live organizer dashboard

---

## Key decisions

| Date | Decision |
|---|---|
| 2026-07-13 | Folder `book-my-show-clone`, product branded "Book My Show". |
| 2026-07-13 | Stack: React+Vite+TS+Tailwind / Express+TS / Postgres / Redis (from flash-ticketing DESIGN.md). |
| 2026-07-13 | Auth: Firebase (Google + email/password) for identity → backend JWT (access+refresh) for authorization; roles live in Postgres/JWT, not Firebase. |
| 2026-07-13 | Theming: all colors/fonts as tokens in `theme.css` + Tailwind mapping; zero hardcoded values in components. |
| 2026-07-13 | Booking correctness: Redis `SET NX EX` holds + idempotency keys + Postgres TX (reuse flash-ticketing design). |
| 2026-07-15 | Deploy target changed from Render to **AWS EC2 (backend, Dockerized + nginx/HTTPS) + Vercel (frontend)**; Neon/Upstash/Firebase unchanged. See DESIGN.md §13 for the cross-origin cookie caveat. |
| 2026-07-15 | Project folder renamed `book-my-show-clone` → **`movie-ticketing-platform`** (better resume framing; product branding in the UI unchanged for now). |
| 2026-07-15 | Local Docker host ports use Postgres `5433` and Redis `6380` to avoid a host-port conflict; container ports remain standard. |
| 2026-07-15 | Development database switched to Neon: pooled connection for the API, direct connection for Drizzle migrations, `sslmode=verify-full`; local Docker Postgres is an opt-in fallback. |
| 2026-07-15 | Development cache switched to Upstash Redis over TLS (`rediss://`); local Docker Redis is now an opt-in fallback. |
| 2026-07-15 | Phase 1 refresh tokens are stored only as httpOnly cookies and backed by single-use Redis session IDs; access/refresh JWTs use separate secrets. |
| 2026-07-15 | Screen layouts are stored as validated JSONB (`rows` with label/count/tier plus aisle columns); show publication in Phase 3 will expand this template into durable per-show seat rows. |
| 2026-07-15 | Catalog browse uses indexed publication/release fields plus GIN indexes for movie genres and languages; organizer approval and role promotion share one database transaction. |
| 2026-07-15 | Managed movie media uses a private encrypted S3 bucket behind CloudFront OAC. Local admin files are manually cropped; remote direct HTTPS raster URLs retain framing; all owned output is metadata-free WebP. Local runtime access uses the S3-scoped `movie-ticketing-media-local` profile; deployments use `movie-ticketing-dev`, and Phase 6 will use an EC2 instance role. |

---

## External services

**Neon Postgres** — development database `neondb`.

- Pooled URL: backend runtime via `DATABASE_URL` in gitignored `backend/.env`.
- Direct URL: Drizzle migrations via `DATABASE_MIGRATION_URL`.
- User/auth, Phase 2 catalog/organizer/theater, and nullable movie-media asset-key migrations
  plus Phase 3 show/seat and Phase 4 order/payment migrations are applied and verified.
- Security follow-up: rotate the currently exposed development-role password; never commit or
  paste its replacement into project documentation.

**Upstash Redis** — development cache and future seat-hold store.

- TLS URL: backend runtime via `REDIS_URL` in gitignored `backend/.env`.
- Connection verified with `PING` → `PONG` on 2026-07-15.
- Security follow-up: rotate the currently exposed token; never commit or paste its replacement
  into project documentation.

**Firebase** (auth only, free Spark plan) — project `movie-ticket-e74a9`, created 2026-07-15.

Frontend config (public by design — for `frontend/.env` as `VITE_FIREBASE_*`):
```
VITE_FIREBASE_API_KEY=AIzaSyDxdLpEwkBtB6yM5t_pAFCIJ5LBzRIHNsE
VITE_FIREBASE_AUTH_DOMAIN=movie-ticket-e74a9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=movie-ticket-e74a9
VITE_FIREBASE_APP_ID=1:176384844463:web:719e2edc65a6acfcc42a5a
```

Backend secret: service-account JSON remains outside the repo and is loaded through
`GOOGLE_APPLICATION_CREDENTIALS`. The local path is stored only in gitignored `backend/.env`;
the key file was validated and restricted to owner-only permissions on 2026-07-15.

Setup checklist: [x] project + web app · [x] Google provider · [x] Email/Password provider ·
[x] service-account key downloaded and ADC path configured · [x] `localhost` authorized domain ·
[x] initial admin email `digi8986@gmail.com` configured · [ ] (Phase 6) add Vercel domain

The admin seed command is implemented. No Firebase identity currently exists for the configured
email; its first verified sign-in will create/promote the Neon row to `ADMIN`, after which
`npm run seed:admin` can be rerun idempotently.

**AWS media** — private S3 origin + CloudFront delivery, `ap-south-1`.

- Official AWS CLI v2 `2.35.23` installed for the current macOS user.
- Versioned CloudFormation is at `infra/media-stack.yaml` and includes private encrypted S3,
  public-access blocking, CloudFront OAC/read-only bucket policy, HTTPS redirect, immutable asset
  caching, incomplete multipart cleanup, and a USD 5 monthly budget notification.
- Stack `movie-ticketing-media-development` is deployed. The private origin bucket is
  `movie-ticketing-media-development-mediabucket-1jullyhkshlv`; delivery uses
  `https://d1f9tbdxdqavp.cloudfront.net`.
- Deployments use the service-scoped `movie-ticketing-dev` IAM profile. Local API media writes use
  `movie-ticketing-media-local`, restricted to `movies/*` in this bucket; values are configured in
  gitignored `backend/.env`. Phase 6 will replace local credentials with an EC2 instance role.
- Live verification passed: application WebP normalization/upload, AES-256 at rest, CloudFront
  HTTP 200 read, direct anonymous S3 HTTP 403, and managed-object deletion. The temporary root
  access key used for IAM bootstrap was deactivated and its plaintext workspace file removed.

**Stripe** — hosted Checkout Sessions, test mode.

- Backend uses the current Stripe SDK/API (`2026-06-24.dahlia`) and creates one-time INR Checkout
  Sessions from server-priced held seats; raw card data never enters the application.
- Checkout return verification requires a paid session whose hold/user/idempotency metadata matches
  before the existing short Postgres confirmation transaction can sell seats and issue a ticket.
- `STRIPE_SECRET_KEY` is intentionally absent from source and currently not configured locally;
  checkout therefore renders a safe disabled state instead of falling back to mock payment.

---

## Session log

### 2026-07-13 — Session 1: Planning
- Read reference `~/Desktop/flash-ticketing/DESIGN.md`; adapted its stack + booking-correctness
  design to a BookMyShow-style product with 3 roles (Admin / Organizer / User).
- Created `DESIGN.md` (roles, auth flow, theme tokens, data model, data flows, API, folder
  structure, phases) and this `MEMORY.md`.
- **Left off at:** planning complete, no code yet. **Next:** Phase 0 scaffold.

### 2026-07-15 — Session 2: Phase 0 scaffold & foundations
- Created an npm-workspaces monorepo with React + Vite + TypeScript + Tailwind in `frontend/`
  and Express + TypeScript in `backend/`.
- Implemented the semantic CSS-variable theme, Tailwind token mapping, responsive theme demo,
  Navbar/Footer, and reusable Button, Card, Input, Badge, Modal, and Spinner primitives.
- Added React Router foundation and installed React Query + Zustand for later phases.
- Added zod-validated environment loading, structured pino HTTP logging/request IDs, Helmet,
  CORS, central typed error handling, graceful shutdown, and `GET /health`.
- Added Drizzle schema + migration for the `users` table and verified the resulting Postgres
  table, enum defaults, unique email, and unique Firebase UID constraints.
- Added Docker Compose for Postgres 17 + Redis 7; both services are healthy locally on host
  ports `5433` and `6380`. Migration applied successfully and Redis returned `PONG`.
- Added ESLint, Prettier, a health endpoint test, root scripts, README quickstart, backend
  Dockerfile, and GitHub Actions CI for format/lint/typecheck/test/build.
- Verified format, lint, typecheck, test, and production builds. Browser QA passed at
  `1440×1000` and `390×844`: no horizontal overflow or console errors; modal city selection
  and mobile navigation work.
- Saved the Phase 0 visual reference at `docs/phase-0-theme-concept.png`.
- **Left off at:** Phase 0 complete and Firebase setup available. **Next:** Phase 1 auth client,
  Firebase token exchange, and backend JWT roles.

### 2026-07-15 — Session 3: Neon development database
- Configured the Express runtime to use Neon's pooled connection and Drizzle Kit to use the
  matching direct connection; credentials live only in gitignored `backend/.env`.
- Switched node-postgres TLS to `sslmode=verify-full` while retaining channel binding.
- Applied the existing Drizzle migration to Neon and verified database `neondb`, the configured
  role, and the `public.users` table.
- Made local Docker Postgres opt-in through the `local-db` Compose profile. Stopped and removed
  the old local container while preserving its volume; Redis remains healthy on port `6380`.
- Verified format, lint, typecheck, tests, production builds, Redis health, and API `/health`.
- **Left off at:** Neon is the active development database. **Next:** Phase 1 Firebase token
  exchange and JWT roles; rotate the temporary Neon password when convenient.

### 2026-07-15 — Session 4: Upstash development Redis
- Configured ioredis to use the Upstash TCP endpoint over TLS through `REDIS_URL` with the
  required `rediss://` scheme; credentials remain only in protected gitignored `backend/.env`.
- Verified the Upstash connection with `PING` → `PONG` without printing credentials.
- Made Docker Redis opt-in through the `local-redis` Compose profile. Stopped and removed the
  local Redis container while preserving its volume.
- Updated root service scripts and README instructions for Neon + Upstash defaults and optional
  local Postgres/Redis fallbacks.
- **Left off at:** Neon and Upstash are active for development. **Next:** Phase 1 Firebase token
  exchange and JWT roles; rotate both temporary exposed credentials later.

### 2026-07-15 — Session 5: Firebase Admin credential preparation
- Validated the external Firebase Admin service-account JSON without exposing its private key;
  project ID matches `movie-ticket-e74a9` and required credential fields are present.
- Restricted the service-account file to owner-only permissions and configured its external path
  via `GOOGLE_APPLICATION_CREDENTIALS` in gitignored `backend/.env`.
- Added safe Firebase placeholders to `backend/.env.example`; the private key remains outside the
  repository and is not embedded in an environment variable.
- **Left off at:** Firebase Admin credentials are ready. **Next:** implement Phase 1; confirm the
  `localhost` authorized domain and provide the email to seed as `ADMIN`.

### 2026-07-15 — Session 6: Firebase local-domain and admin identity
- Confirmed from the Firebase Authentication settings that `localhost` is an authorized domain;
  the Firebase-hosted domains are also present.
- Configured `digi8986@gmail.com` as `ADMIN_SEED_EMAIL` in gitignored `backend/.env` and added a
  non-sensitive placeholder to `.env.example`.
- Added zod validation for Firebase credential path, project ID, and admin seed email.
- **Left off at:** all Phase 1 configuration inputs are ready. **Next:** implement Firebase client
  auth, ID-token exchange, backend JWT rotation, guards, and the admin seed script.

### 2026-07-15 — Session 7: Phase 1 auth & roles
- Added Firebase web authentication for Google popup and email/password registration/login, plus
  accessible responsive Login and Register pages that reuse the Phase 0 theme system.
- Added the backend Firebase ID-token exchange, Neon identity upsert, application access JWTs,
  HTTP-only refresh cookies, Upstash-backed single-use refresh rotation, trusted-origin checks,
  logout revocation, `/auth/me`, account suspension enforcement, and separate access/refresh keys.
- Added an in-memory Zustand auth store, refresh bootstrap, one-refresh/one-retry API behavior,
  protected account/admin routes, auth-aware navigation, and starter account/admin screens.
- Added `requireAuth` and `requireRole`, JWT/origin middleware tests, an idempotent admin seed
  command, and automatic first-sign-in promotion for the configured admin identity.
- Verified the live Firebase email flow against Neon and Upstash: token exchange, `/auth/me`,
  refresh rotation, old-token replay rejection, logout, and temporary-user cleanup all passed.
- Full format, lint, typecheck, unit tests (6), and production builds pass. Browser QA passed at
  desktop and mobile widths with no horizontal overflow or console errors; login/register
  navigation, password-match validation, and anonymous protected-route redirects work.
- Visual fidelity ledger: retained the accepted navy header, brand-pink controls, neutral page
  background, rounded white surfaces, borders, typography scale, and restrained shadows from the
  Phase 0 concept; auth-specific forms were added without introducing a competing visual system.
- Dependency audit follow-up: current `firebase-admin@14.1.0` pulls `uuid@9.0.1` through Google
  Cloud Storage. npm reports the buffer-boundary advisory, but the installed callers use only
  `uuid.v4()` without caller-supplied buffers; npm offers only a breaking Admin SDK downgrade.
  Keep the supported graph and recheck when Firebase Admin updates its storage dependency.
- **Left off at:** Phase 1 complete. **Next:** Phase 2 database schemas and admin/organizer catalog
  workflows. One manual Google account sign-in is still recommended as a provider smoke check.

### 2026-07-15 — Session 8: Phase 2 catalog & organizer onboarding
- Added Drizzle schemas and a Neon migration for movies, organizer applications, theaters, and
  screens, including publication/lookup indexes, array GIN indexes, ownership constraints, and
  validated JSONB seat-layout templates.
- Implemented public movie browse/detail APIs; admin movie CRUD; organizer application status,
  apply/resubmit, review, and transactional approval; and ownership-scoped theater/screen CRUD.
- Added a catalog seed with four development movies and generated original local poster assets.
  The seed is idempotent and runs with `npm run seed:catalog`.
- Built the real-data home/catalog/detail experience, admin catalog and organizer-review
  workspace, organizer application states, theater management, and a responsive tier/aisle seat
  layout builder with a live preview.
- Added schema validation tests and `npm run verify:phase2`, which passed against Firebase,
  Neon, and Upstash while cleaning up its temporary identities and records.
- Full format, lint, typecheck, unit tests (9), production builds, catalog seeding, and the live
  Phase 2 verifier pass.
- Browser QA passed for catalog search/filter/detail, the 390px mobile menu and overflow checks,
  authenticated admin movie/organizer views, and organizer theater/screen layout forms. Console
  logs were clean; all temporary QA identities, database records, files, and browser tabs were
  removed.
- Visual fidelity ledger: retained the concept's navy management/header frame, brand-pink CTAs,
  neutral canvas, compact bordered data table, rounded modal treatment, poster-led catalog grid,
  language pills, and strong hero typography. The production home uses an original three-poster
  stage instead of the concept's theater photograph, and real account/status copy replaces the
  illustrative concept data.
- Saved Phase 2 visual references at `docs/phase-2-catalog-concept.png` and
  `docs/phase-2-admin-concept.png`; production posters live in `frontend/public/posters/`.
- **Left off at:** Phase 2 complete. **Next:** Phase 3 show schemas, show publication/seat
  expansion, showtime selection, and the read-only live seat map.

### 2026-07-15 — Session 9: Managed movie images and AWS media foundation
- Installed official AWS CLI v2 without creating long-lived/root access keys and added a
  versioned CloudFormation stack for private S3, CloudFront OAC, lifecycle cleanup, and the USD 5
  budget alerts; documented the named SSO deploy flow and output extraction.
- Added admin-only upload/import/delete media APIs with JPEG/PNG/WebP byte/pixel limits, Sharp
  WebP normalization and metadata stripping, fixed local crop output, redirect/DNS/SSRF defenses,
  unique managed keys, attachment protection, and best-effort managed-object cleanup.
- Added nullable `poster_asset_key` and `banner_asset_key` columns and applied the migration to
  Neon. Existing URL-only and local `/posters/...` records remain unchanged and are never deleted.
- Replaced URL-only admin controls with reusable poster/banner image managers, lazy-loaded inline
  crop UI, URL guidance, previews, validation/errors, staged upload progress, and rollback when a
  movie mutation fails.
- Added backend image/security tests and frontend media workflow tests. Format, lint, typecheck,
  all 31 tests, production builds, and the live Phase 2 Neon verifier pass.
- Browser QA passed on the authenticated admin modal at desktop and 390×844: direct HTTPS URL
  selection, previews, cancellation, internal modal scrolling, footer reachability, no horizontal
  overflow, and clean console logs. Local file chooser automation is blocked until Chrome's
  ChatGPT extension is allowed file-URL access; crop behavior remains covered by unit tests.
- **Left off at:** application and infrastructure code complete. **Next:** enable/configure the
  `movie-ticketing-dev` AWS SSO profile, deploy the stack, fill the two output env values, run the
  live S3/CloudFront smoke test, then continue Phase 3.

### 2026-07-16 — Session 10: AWS media deployment
- Fixed the CloudFormation budget-email validation pattern and deployed
  `movie-ticketing-media-development` in `ap-south-1` with private encrypted S3, CloudFront OAC,
  and USD 5 budget notifications.
- Created separate non-root IAM identities for infrastructure deployment and local runtime media
  access; the runtime policy is restricted to the deployed bucket's `movies/*` objects.
- Configured the stack outputs and runtime profile in gitignored `backend/.env`, restarted the API,
  and verified its Sharp-to-WebP upload/CloudFront-read/delete path end to end.
- Deactivated the root access key used for bootstrap and removed its plaintext workspace file.
- **Left off at:** AWS media is operational. **Next:** continue Phase 3 show schemas, publication,
  showtime selection, and the read-only live seat map.

### 2026-07-16 — Session 11: Phase 3 shows and read-only seat map
- Added indexed `shows`, `show_pricing`, and `show_seats` schemas with ownership-safe organizer
  APIs, exact screen-tier pricing validation, future-start enforcement, and transactional seat
  generation when a scheduled show goes on sale. Migration `0003_mean_tigra.sql` is applied to Neon.
- Added public city/date/theater showtime discovery plus show details and Redis-aware seat-map reads;
  only active-theater, on-sale shows are public.
- Added the organizer Shows workspace, show creation/pricing modal, publish/cancel controls, movie
  showtime picker, and responsive read-only tiered SeatMap route with 15-second availability refresh.
- Added schema/seat expansion tests and `npm run verify:phase3`, which creates and cleans temporary
  records while proving schedule → publish → showtimes → seats against Neon and Upstash.
- Typecheck, all 34 tests, production builds, migration, and live verifier pass. Browser QA passed
  at 1440px and 390px with no page overflow, console errors, or framework overlay; the horizontal
  seat canvas remains scrollable on mobile. All browser QA records were removed afterward.
- Preserved nine generated original showcase poster/banner sources in `docs/showcase-media/source/`;
  they are not in the database or S3 yet, and no showcase organizer/show data has been created.
- The existing `Silver city` organizer application was approved concurrently during final checks;
  that user-owned role change was preserved. There are still zero persistent theaters/shows/seats.
- **Left off at:** Phase 3 complete. **Next:** use the approved organizer for showcase venues,
  upload original media to S3, and seed the catalog/shows.

### 2026-07-16 — Session 12: Theater validation fix and first showcase venue
- Aligned the Add theater form with the backend's address contract: trimmed addresses shorter than
  eight characters are blocked before the request, and rejected mutations now render an accessible
  modal error instead of producing an unhandled promise rejection.
- Added regression coverage for the short-address guard and rejected-request message. All nine
  frontend tests, lint, and typecheck pass.
- Browser QA verified the original `Mumbai` address is rejected locally with a clear message and a
  clean console, then successfully created the active `Silver-city` theater in Mumbai at
  `Andheri West, Mumbai` using the approved organizer account.
- **Left off at:** organizer and first theater are ready. **Next:** create showcase screens and seat
  tiers, upload the prepared media to S3, then seed movies and shows.

### 2026-07-16 — Session 13: Phase 4 booking pipeline
- Added migration `0004_slim_vapor.sql` with indexed/constrained orders, uniquely sold order items,
  mock-payment records, idempotency keys, and unique ticket codes; it is applied to Neon.
- Added authenticated booking APIs for atomic five-minute Redis holds, checkout recovery, early
  release, TTL expiry, idempotent confirmation, booking history, and individual e-tickets. Redis
  Lua gives all-or-nothing multi-seat acquisition with rollback, while confirmation locks seats in
  stable order and writes order/items/payment/sold state in one short Postgres transaction.
- Upgraded the public seat map to selectable seats and a held checkout flow, then added the live
  countdown, mock-payment summary, QR confirmation ticket, My Bookings history, protected routes,
  and navigation entry.
- Added booking schema/countdown tests and a configured-Redis concurrency test: 20 parallel holds
  on one seat produce exactly one winner. All 40 automated tests pass.
- Added `npm run verify:phase4`; its cleanup-safe live run proves a 12-way API race, one idempotent
  order, durable sold state, QR/history reads, early release/reacquisition, and TTL expiry against
  Neon and Upstash.
- Browser QA passed the authenticated 1440×900 and 390×844 journey with two seats, ₹500 total,
  active countdown, QR e-ticket, booking history, no mobile page overflow, and clean console. The
  temporary QA screen/movie/show/order/Redis records were removed afterward.
- **Left off at:** Phase 4 complete and Silver-city remains ready. **Next:** create its real screens
  and tiers, upload prepared showcase media to S3, seed movies/shows, then begin Phase 5.

### 2026-07-16 — Session 14: Phase 5 dashboards and polish
- Added organizer sales analytics with per-show and overall sold/held/available counts and confirmed
  revenue. Added platform metrics for users, partners, catalog, venues, shows, bookings, revenue, and
  pending applications using batched aggregate queries and live Redis hold overlays.
- Added searchable admin user management with role/status filters, self-suspension protection, and
  Redis-backed immediate suspend/restore enforcement. Migration `0005_medical_ogun.sql` adds the
  composite status/role/created index and is applied to Neon.
- Replaced the exposed mock-payment contract and UI with current Stripe-hosted Checkout Sessions.
  Server-priced held seats become INR line items; successful returns are retrieved from Stripe and
  checked for paid status and matching user/hold/idempotency metadata before durable confirmation.
  With no test secret configured, the UI safely displays `Stripe setup required`.
- Added atomic Redis fixed-window limits to Firebase exchange/refresh and booking mutations with
  remaining/retry headers and typed HTTP 429 errors.
- Added dynamic public movie facets and combined title/language/genre/city filters; city results only
  include published movies with active, on-sale shows in that city.
- Added Phase 5 schema/rate-limit tests and `npm run verify:phase5`. All 43 tests, Phase 4 and Phase 5
  live verifiers, formatting, lint, typecheck, and production builds pass.
- Browser QA passed organizer revenue/availability, admin totals, temporary-user suspend/restore,
  live Mumbai filtering, and the Stripe configuration state. Mobile admin overflow found at 407px
  was fixed with a two-column navigation grid and retested at exactly 390px with a clean console.
  Temporary Firebase/Neon QA identities and the held seat were removed afterward.
- **Left off at:** Phase 5 application work complete. **Next:** add a Stripe test secret and perform
  one hosted-checkout smoke test; then resume showcase screens/media/shows.

### 2026-07-16 — Session 15: Phase 6 repository and deployment foundation
- Replaced `Ashish5689/flash-ticketing` `main` with a new clean history from this workspace using a
  remote-head lease. A staged-content scan excluded all production URLs/credentials, and local
  `.env` files, AWS credentials, Firebase Admin JSON, dependencies, and build output are ignored.
- Added Vercel SPA routing, an EC2/CloudFront CloudFormation stack, encrypted SSM configuration,
  an S3-scoped EC2 role, IMDSv2, encrypted EBS, CloudFront-only origin ingress, Docker/nginx health
  deployment, Drizzle migrations on deploy, and graceful no-SSH Systems Manager administration.
- Added a GitHub OIDC role template and GitHub Actions workflow that deploys through SSM without
  static AWS keys. The project passed formatting, lint, typecheck, all 43 tests, production builds,
  and CloudFormation template validation before publication.
- Connected Vercel access was verified and the target team identified. The frontend production
  deployment intentionally waits for the final CloudFront API URL so the first live build is not
  configured against localhost or a placeholder.
- The existing AWS media deployer can validate CloudFormation but cannot inspect/create EC2. The
  newly supplied `aws-profile.txt` contains structurally valid key lengths but AWS rejects it with
  `InvalidClientTokenId`; no Phase 6 AWS resources were created with that key.
- **Left off at:** GitHub replacement and deployment code are complete. **Next:** provide an active
  Phase 6 AWS credential pair, deploy the backend, configure Vercel, and run production/load smoke
  tests.

### 2026-07-16 — Session 16: Phase 6 production deployment
- Rewrote every repository commit to `Ashish Jha <Ashisheduims@gmail.com>` and force-pushed `main`
  with a remote-head lease; all subsequent commits use the same author and committer identity.
- Deployed customer-KMS-encrypted Secrets Manager entries, CloudTrail/CloudWatch secret-access
  auditing, a hardened Amazon Linux EC2 instance, nginx, Docker, an Elastic IP, and a CloudFront
  HTTPS API distribution. Verified two-of-two EC2 checks, encrypted gp3, IMDSv2, termination
  protection, CloudFront-only ingress, blocked direct-origin access, SSM access, and healthy services.
- Built and installed AWS Workload Credentials Provider 3.1.0 and the pinned `asm-exec` wrapper so
  the instance resolves dynamic secret references without checking credentials into code or CI.
- Created the GitHub OIDC provider/deploy role and repository variables. A `main` push successfully
  assumed the role, deployed through SSM, ran migrations, replaced the container, and passed health.
- Published the Vite production artifact to Vercel at `https://flash-ticketing-neon.vercel.app`,
  configured its public EC2 API URL, updated exact-origin backend CORS, and added the domain to
  Firebase authorized domains. SPA deep-link rewrites and public availability return HTTP 200.
- Uploaded four showcase posters to the private encrypted media bucket and verified CloudFront
  delivery. Seeded the production catalog and admin role; added an idempotent Mumbai organizer,
  theater, screen, and five-day show schedule seed for the live demo.
- **Left off at:** production deployment is live. **Next:** optional dedicated k6 report and the
  pending Stripe-hosted checkout smoke test. Revoke the AWS access key disclosed in chat.
