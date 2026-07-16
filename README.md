# Book My Show

A full-stack movie and event ticketing platform built as an npm-workspaces monorepo.

## Development quick start

Requirements: Node.js 20+ and npm. Docker Desktop is optional for local service fallbacks.

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Replace DATABASE_URL with the pooled Neon URL and
# DATABASE_MIGRATION_URL with the direct Neon URL.
# For node-postgres, prefer sslmode=verify-full.
# Replace REDIS_URL with the TLS Upstash URL (rediss://...).
# Add Firebase web config to frontend/.env and point
# GOOGLE_APPLICATION_CREDENTIALS at an external service-account JSON.
# Generate different 32+ character JWT_ACCESS_SECRET and JWT_REFRESH_SECRET values.
# For the deployed infra/media-stack.yaml, add AWS_PROFILE, AWS_REGION,
# AWS_S3_BUCKET, and MEDIA_PUBLIC_BASE_URL to backend/.env.
npm run db:migrate
npm run dev
```

- Frontend: <http://localhost:5173>
- API health: <http://localhost:4000/health>
- Postgres: Neon by default (`DATABASE_URL`)
- Redis: Upstash by default (`REDIS_URL`)

To use the optional local Postgres fallback on `localhost:5433`, run
`npm run services:db:up`. To use local Redis on `localhost:6380`, run
`npm run services:redis:up`. `npm run services:up` starts both local fallbacks.

## Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
npm run seed:admin
npm run seed:catalog
# Live Firebase + Neon + Upstash auth verification (temporary identity is cleaned up):
FIREBASE_WEB_API_KEY=<public-firebase-web-api-key> npm run verify:auth
# Live Phase 2 API/role/ownership verification (temporary records are cleaned up):
npm run verify:phase2
# Live Phase 3 schedule/publish/showtime/seat verification (temporary records are cleaned up):
npm run verify:phase3
# Live Phase 4 hold/concurrency/confirm/ticket verification (temporary records are cleaned up):
npm run verify:phase4
# Live Phase 5 analytics/filter/suspension verification (temporary records are cleaned up):
npm run verify:phase5
npm run services:down
```

Stripe payment uses hosted Checkout Sessions in test mode. Set `STRIPE_SECRET_KEY=sk_test_...`
in `backend/.env`; without it, checkout remains safely disabled and shows “Stripe setup required.”

## Movie media storage

Admins can crop JPEG, PNG, or WebP poster/banner files from their device or import a direct
HTTPS raster-image URL. The API normalizes every owned image to metadata-free WebP and stores it
in a private S3 bucket; public delivery is through CloudFront only. Local files are cropped to
`800×1200` posters or `1600×900` banners, while imported URLs preserve their framing.

AWS infrastructure is defined in `infra/media-stack.yaml`. It creates the private encrypted S3
bucket, CloudFront Origin Access Control, read-only bucket policy, incomplete-upload cleanup, and
a USD 5 monthly budget alert. Follow `infra/README.md` for the named deployment/runtime profiles
in `ap-south-1`. Never add AWS access keys to frontend or backend env files.

Architecture and delivery phases are documented in `DESIGN.md`; current progress is tracked in
`MEMORY.md`.
