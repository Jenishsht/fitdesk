<<<<<<< HEAD
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
=======
# fitdesk
gym management 
>>>>>>> 30c79db7be1f11be16165cd6fca03aca0d7e864f

# like for the qr. we need to  run this  2nd terminal
<!-- loudflared tunnel --url http://localhost:3000 -->
 #  change the url or that next_base..in env file and th it wook 
<!-- Quick checklist for deploy day:

Deactivate IP blocking at https://app.brevo.com/security/authorised_ips (enter the verification code if asked, then refresh the page to confirm it says deactivated).
Make a new CRON_SECRET with openssl rand -hex 32.
Add all four variables on your host: DATABASE_URL, BREVO_API_KEY, BREVO_SENDER_EMAIL, CRON_SECRET.
Use an online database (Neon, Supabase, or Railway).
Set the build command to prisma generate && next build.
Add the daily schedule (vercel.json or cron-job.org).
After deploying, run the curl once with your live URL to confirm emails send.   

^Z^C
jenishshrestha@macbookair fitdesk % curl -H "Authorization: Bearer b52a78f37cf35c664d9eddaaff6884b14c8deba2be433fd5" http://localhost:3000/api/cron/expiry-reminders -->
