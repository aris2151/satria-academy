# SATRIA ACADEMY — TNI–Polri Preparation Platform

The app has been separated from Hatchable in its source configuration. The no-monthly-fee target is a static frontend on Cloudflare Pages, a Supabase Edge Function API, and Supabase for PostgreSQL and email OTP authentication.

## Architecture

- `public/` — static pages and browser code.
- `dist/` — generated Cloudflare Pages output; do not edit or commit.
- `supabase/functions/satria-api/` — deployed API; verifies Supabase sessions and admin membership before handling private requests.
- `supabase/config.toml` — keeps gateway JWT checks disabled so public inquiry endpoints work; the function enforces user/admin access itself.
- `supabase/migrations/` — PostgreSQL schema and initial content for a new Supabase project.
- `scripts/generate-runtime-config.js` — builds the static site and injects public Supabase/API configuration.
- `server/` and `api/` — legacy Express API retained for local development; production uses the Edge Function.

The browser only receives the Supabase publishable/anon key. The Edge Function uses the Supabase service-role key from Supabase's server-side secrets; never put it in Cloudflare Pages variables or browser code. Admin membership is checked against `public.admin_users`, not user-editable metadata. Tables have RLS enabled and no direct grants to `anon` or `authenticated`; application data access goes through the Edge Function.

## Local setup

Requirements: Node.js 20+, an accessible Supabase project, and the project's database connection string for the legacy local Express API.

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `CORS_ORIGINS`.
2. Install dependencies with `npm install`.
3. Apply `supabase/migrations/20261103000000_initial_schema.sql` to the Supabase project using the Supabase SQL Editor or CLI.
4. Configure Supabase Auth email OTP, SMTP delivery, and the allowed redirect URL for the local frontend (for example `http://localhost:8080/login`).
5. Build the static frontend with `npm run build`.
6. In one terminal run `npm run dev`. In another run `npx serve dist -l 8080`, then open `http://localhost:8080`.

For local development, the static site and Express API run at different origins; include `http://localhost:8080` in `CORS_ORIGINS`. The production Edge Function does not use `DATABASE_URL`; keep the service-role key in Supabase secrets only.

## Supabase setup

1. Create a Supabase project and set a strong database password.
2. Apply the migration in `supabase/migrations/`.
3. Before deploying the Edge Function, also apply `supabase/migrations/20261104000000_edge_api_rate_limits.sql`; it adds the private table/function used to preserve inquiry rate limiting.
4. Keep the Supabase project URL and publishable/anon key for the frontend build. The Edge Function also needs the service-role key stored only in Supabase function secrets.
5. In Supabase Auth, enable email OTP, configure production SMTP, and allow the deployed Cloudflare Pages login redirect URL. If the email template uses a numeric code, use the Supabase OTP template variable (`{{ .Token }}`).
6. Create the first admin by signing up that person through the app and then running this statement in the SQL Editor, replacing the email:

   ```sql
   INSERT INTO public.admin_users (user_id)
   SELECT id FROM auth.users WHERE lower(email) = lower('admin@example.com')
   ON CONFLICT (user_id) DO NOTHING;
   ```

Only trusted operators should be added to `admin_users`. Verify access with separate student and admin accounts.

## Deploy API to Supabase Edge Functions

1. Apply `supabase/migrations/20261104000000_edge_api_rate_limits.sql` to the existing Supabase database.
2. Install/use the Supabase CLI, run `npx supabase login`, then link the existing project with `npx supabase link --project-ref <PROJECT_REF>`.
3. In Supabase Dashboard → **Edge Functions → Secrets**, ensure `SUPABASE_SERVICE_ROLE_KEY` is set and set `CORS_ORIGINS` to the exact Cloudflare Pages production origin(s), without a trailing slash. Add preview domains only if they need API access.
4. From the repository root, deploy with `npx supabase functions deploy satria-api`. The function configuration disables gateway JWT enforcement because the function itself verifies student/admin sessions and must also serve public routes.
5. The API base URL is `https://<PROJECT_REF>.supabase.co/functions/v1/satria-api`. Check `https://<PROJECT_REF>.supabase.co/functions/v1/satria-api/healthz`; it should return `{"status":"ok"}`.

Supabase Free includes Edge Functions and Postgres within its quotas. Free projects may pause after one week of inactivity; review the current [Supabase pricing](https://supabase.com/pricing). A custom SMTP provider may be needed for reliable production OTP email.

## Deploy frontend to Cloudflare Pages

1. Create a Cloudflare Pages project from GitHub repository `aris2151/satria-academy`, branch `static-root-deploy`, with repository root `.`.
2. Set the build command to `npm run build` and the output directory to `dist`.
3. Set these build environment variables for Production (and Preview if used): `API_BASE_URL=https://<PROJECT_REF>.supabase.co/functions/v1/satria-api`, `SUPABASE_URL=https://<PROJECT_REF>.supabase.co`, and `SUPABASE_ANON_KEY=<publishable-or-anon-key>`.
4. After the first Pages deployment reveals its `*.pages.dev` origin, add that exact origin to the Supabase Edge Function `CORS_ORIGINS` secret. Redeploy the function if needed, then redeploy Pages. Cloudflare Pages reads `public/_redirects` for the `/login` route.
5. Add the deployed Pages URL to Supabase Auth's allowed redirect URLs and set the login redirect URL accordingly. Redeploy after changing any build variable; the public config is generated at build time.

Vercel Hobby is free but restricted to non-commercial, personal use under its fair-use rules. Since this academy advertises paid packages, use Cloudflare Pages rather than relying on Hobby for production.

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
- [ ] Inspect CORS allowlist, HTTPS, browser console, Edge Function logs, and the `/healthz` endpoint.
- [ ] Check responsive layout, keyboard focus, reduced motion, and PWA/offline behavior; verify offline cache does not make API data appear current.
- [ ] Verify the production build includes the right API origin and Supabase project, with no server secrets in `dist/`.
- [ ] After deployment, create a test inquiry and remove or label it according to the retention policy.

## Scope and cutover status

The static frontend and Supabase Edge Function implementation are prepared in the `static-root-deploy` branch. The function and Cloudflare Pages project still need to be deployed and configured by the project owner. No production data transfer, DNS change, or live authentication test has been performed.
