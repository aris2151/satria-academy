# SATRIA ACADEMY — TNI–Polri Preparation Platform

The app has been separated from Hatchable in its source configuration. The target deployment is a Next.js project on Vercel serving the SATRIA pages from `public/`, an Express API on Render, and Supabase for PostgreSQL and email OTP authentication.

## Architecture

- `app/` — the existing Next.js application.
- `public/` — SATRIA landing, login, admin, and student pages plus browser code.
- `server/` — Express API host, Supabase Auth token verification, and PostgreSQL pool.
- `api/` — existing route handlers, now loaded by Express. Route `access` declarations are enforced by the host.
- `supabase/migrations/` — PostgreSQL schema and initial content for a new Supabase project.
- `scripts/generate-runtime-config.js` — injects public Supabase/API configuration before Next.js builds or runs.
- `render.yaml` — deployment configuration for the Express API.

Next.js rewrites `/` and `/login` to the SATRIA landing and login documents in `public/`. The browser only receives the Supabase publishable/anon key. `DATABASE_URL` is server-only and the API connects to Postgres directly. Admin membership is checked against `public.admin_users`; it is not controlled by user-editable metadata. Tables have RLS enabled and no direct grants to `anon` or `authenticated`; application data access goes through the Express API.

## Local setup

Requirements: Node.js 20+, an accessible Supabase project, and the project's database connection string.

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `CORS_ORIGINS`.
2. Install dependencies with `pnpm install`.
3. Apply `supabase/migrations/20261103000000_initial_schema.sql` to the Supabase project using the Supabase SQL Editor or CLI.
4. Configure Supabase Auth email OTP, SMTP delivery, and the allowed redirect URL for the local frontend (for example `http://localhost:3000/login`).
5. Set `API_BASE_URL=http://localhost:3001` for the frontend build configuration and `CORS_ORIGINS=http://localhost:3000` for the API.
6. Run `pnpm dev` to start Next.js. In a second terminal run `pnpm dev:api` with `PORT=3001`, then open `http://localhost:3000`.

The frontend and API need to run at different local origins; include the frontend origin in `CORS_ORIGINS`. Never expose `DATABASE_URL` or a Supabase `service_role` key in browser code. This project does not require the service-role key.

## Supabase setup

1. Create a Supabase project and set a strong database password.
2. Apply the migration in `supabase/migrations/`.
3. Copy the Supabase project URL, publishable/anon key, and a PostgreSQL connection string into the required environment variables.
4. Prefer the Supabase **session pooler** connection string for the persistent Express service on Render if direct database connectivity is unavailable. Keep SSL enabled.
5. In Supabase Auth, enable email OTP, configure production SMTP, and allow the deployed Vercel login redirect URL. If the email template uses a numeric code, use the Supabase OTP template variable (`{{ .Token }}`).
6. Create the first admin by signing up that person through the app and then running this statement in the SQL Editor, replacing the email:

   ```sql
   INSERT INTO public.admin_users (user_id)
   SELECT id FROM auth.users WHERE lower(email) = lower('admin@example.com')
   ON CONFLICT (user_id) DO NOTHING;
   ```

Only trusted operators should be added to `admin_users`. Verify access with separate student and admin accounts.

## Deploy API to Render

1. Connect the repository to Render and create a Web Service using `render.yaml`. The service installs the workspace dependencies and starts `server/index.js`.
2. Add the required Render environment variables: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CORS_ORIGINS`, and `NODE_ENV=production`.
3. Set `CORS_ORIGINS` to the exact Vercel production origin(s), without a trailing slash. Add preview domains only if they need API access.
4. Wait for the service health check at `/healthz` to pass and note the public API origin.

## Deploy frontend to Vercel

1. Import the same repository into Vercel and keep the detected Next.js framework settings; do not set a static output directory.
2. Set `API_BASE_URL` to the Render API origin, `SUPABASE_URL` to the project URL, and `SUPABASE_ANON_KEY` to the publishable/anon key as Vercel environment variables.
3. Deploy and add the Vercel production URL to both Supabase Auth redirect URLs and Render `CORS_ORIGINS`.
4. Redeploy after changing any frontend environment variable; the public config is generated during the build.

## Admin content editing

1. Sign in through `/login` using the admin account already added to `public.admin_users`.
2. Open `/admin.html` and choose **Konten & gambar**.
3. Edit the banner, hero copy, optional public HTTPS image URL, and WhatsApp number; review the preview and save.
4. Reload the public homepage and test all CTA destinations.

The editor uses defaults when a setting has not been saved. Hero images are public HTTPS URLs; this editor does not upload files.

## Recruitment schedule source check

Checked on 3 November 2026 against official portals:

- [TNI AD recruitment portal](https://ad.rekrutmen-tni.mil.id/) displayed CABA/CATA PK Gelombang I TA 2027. The exact registration and validation deadlines were not confirmed from the accessible page, so the seeded entry is marked **Perlu verifikasi** and does not publish unconfirmed dates.
- [TNI recruitment portal](https://rekrutmen-tni.mil.id/landing-page) displayed PA PK TNI Gelombang II Khusus Dokter Spesialis for 16 September–13 November 2026. The seed includes this specific entry; applicants should confirm current status and qualifications on the official portal.
- [TNI AL recruitment portal](https://al.rekrutmen-tni.mil.id/) provided general recruitment information, but a current pathway-specific deadline was not confirmed.
- The [POLRI schedule portal](https://penerimaan.polri.go.id/jadwal_seleksi/) could not be reached during this check. No TA 2027 dates are asserted.

These are a point-in-time check, not an automated schedule feed. Recheck official announcements before publishing or acting on a deadline; update `checked_at`, status, and date fields through the admin schedule editor when verified.

## Migrating data from Hatchable

The Supabase migration creates the schema; it does not transfer existing production records or passwords. Before switching domains, export the Hatchable database and back it up. Import content, schedules, materials, quizzes, tokens, inquiries, profiles, tasks, and attempts into the new database, and reconcile each old account ID with the corresponding newly created Supabase Auth user ID. Never import old password hashes as Supabase credentials. Test representative records and account ownership in staging before the cutover. Keep the old service and backup intact until the new deployment is accepted.

## Production go-live checklist

### Content, privacy, and operations

- [ ] Verify every public claim, fee, staff credential, testimonial, image permission, date, and external link. Check recruitment dates against official TNI/Polri portals and avoid implying affiliation or guaranteeing acceptance.
- [ ] Confirm privacy notice, consent, data-retention/deletion process, support contact, and inquiry follow-up ownership before collecting personal data.
- [ ] Review the production WhatsApp number, email OTP template, SMTP delivery, and redirect allowlist.
- [ ] Add only named operators to `admin_users`; test that unauthenticated and student accounts cannot call admin APIs.
- [ ] Confirm backup and restore/recovery procedures for Supabase before importing or changing production data.

### Release verification

- [ ] Test login, OTP verification, sign-out, session renewal, and redirect handling on desktop and mobile.
- [ ] Test inquiry creation with consent, admin status updates, content save/reload, and working WhatsApp calls.
- [ ] Test student profile, tasks, practice token lifecycle, quiz grading, materials, recruitment schedules, and empty/error states.
- [ ] Confirm private endpoints reject missing/invalid tokens and non-admin users; confirm public endpoints disclose no unpublished/admin data.
- [ ] Inspect CORS allowlist, HTTPS, browser console, API logs, and the `/healthz` endpoint.
- [ ] Check responsive layout, keyboard focus, reduced motion, and PWA/offline behavior; verify offline cache does not make API data appear current.
- [ ] Verify the production build uses the right API origin and Supabase project, and exposes neither `DATABASE_URL` nor a `service_role` key in public files.
- [ ] After deployment, create a test inquiry and remove or label it according to the retention policy.

## Scope and cutover status

The codebase now contains the Vercel/Render/Supabase application foundation and Supabase schema. The cloud services still need to be created and configured by the project owner. No production migration, data transfer, DNS change, or live authentication test has been performed.
