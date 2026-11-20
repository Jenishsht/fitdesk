# FitDesk — Multi-tenant Gym Management SaaS

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui-style components · Prisma 7 + PostgreSQL · Auth.js v5

## Run it locally

```bash
npm install
cp .env.example .env            # then set AUTH_SECRET  (openssl rand -base64 32)
docker compose up -d            # local PostgreSQL (or point DATABASE_URL at Neon/Supabase)
npx prisma migrate dev --name init
npm run db:seed
npm run dev                     # http://localhost:3000
```

Seed logins (password `Password@123`):

| Role | Email |
|---|---|
| Super admin | admin@fitdesk.test |
| Gym owner | owner@ironpeak.test |
| Gym staff (limited) | staff@ironpeak.test |
| Member | member@ironpeak.test |

## Put it on GitHub

```bash
git init && git add . && git commit -m "FitDesk initial"
git branch -M main
git remote add origin https://github.com/<you>/fitdesk.git
git push -u origin main
```

Deploy: import the repo in Vercel, set `DATABASE_URL`, `AUTH_SECRET`, then run `npx prisma migrate deploy` against the production DB.

## How tenant isolation works

* `requireGym()` (`src/lib/session.ts`) finds the gym from the **session → GymUser table**. The browser never sends a `gymId`.
* Every query includes `gymId` in its `where` clause; every write action calls `ctx.assert(permission)` on the server.
* Membership status is **derived from dates** (`src/lib/membership.ts`), not stored.
* Money-related writes run in `db.$transaction`; duplicate payment references are blocked by a unique index.

## Status

Done: auth + gym registration, tenant guard, RBAC, dashboard (real DB stats + charts), members (search/filter/pagination/CSV), plans, memberships (new + renewal history), payments (manual), manual attendance, member portal home, super-admin overview, full schema for everything in the spec.

Next phases (schema is already in place): forgot/reset password + email verification, staff management UI, QR check-in, reports page + date-range filters, PDF receipts, expiry cron + WhatsApp Cloud API sender (NotificationLog dedupe key is ready), SaaS plan/pricing admin, gym settings page, remaining member-portal pages, cloudinary uploads.
