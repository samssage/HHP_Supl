# HHP Equipment Finder

Web app for York College's Health & Human Performance department. Faculty look up any PE skills
course, movement skill, room or item and see what equipment exists and exactly where it's stored.
Staff count storage rooms from their phones (QR label on the door → count screen) to keep the
inventory verified.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Data

Department inventory, storage locations, course mappings, and disposal history are held privately
in Supabase. Source spreadsheets and importer configuration remain in the owner's local project
and are excluded from this public repository. Course kits can be adjusted in the app.

## Storage and deployment

Apply the migration in supabase/migrations, privately import the inventory with scripts/export_store.py, and configure the variables listed in .env.example. Department data is excluded from this public repository.

With Supabase configured, mutable records persist through server-only RPCs with transaction and
revision checks. Local development without credentials retains the JSON store.
Production requires Supabase. The public `/login` page uses individual Supabase email/password accounts; the old HHP_STAFF_USER/PASSWORD variables are no longer used.

## Staff login setup

1. Set the Supabase URL, server-only secret, and publishable (or legacy anon) key in Vercel; see `.env.example`. Redeploy after updating variables.
2. In Supabase Authentication URL Configuration, set the Site URL to the app's final production URL followed by `/auth/callback`. Allow that exact callback URL under Redirect URLs. This handles dashboard invitations and password recovery links.
3. Invite approved staff through Supabase Authentication → Users. Staff follow their invitation to choose a password. Keep public signups disabled for this staff-only app.
4. Grant each approved account `app_metadata.hhp_staff = true` using Supabase's admin API, or run the SQL below for the exact approved email. Users cannot grant this role through their profile. Verify the returned email before finishing onboarding.

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"hhp_staff":true}'::jsonb
where lower(email) = lower('APPROVED_STAFF_EMAIL')
returning id, email;
```

To revoke access, remove `hhp_staff` from `raw_app_meta_data`. The app checks the current user with Supabase on data access, so a previously issued session does not retain a removed staff grant. Password reset emails can be sent from Supabase's user dashboard and use the same callback/password setup screen. No public signup form is provided, and ordinary authenticated accounts cannot read inventory.

The proxy refreshes sessions and redirects unauthenticated visitors to `/login`. Every inventory read/write independently checks the verified staff role before using the server-only database RPCs.

## Pages

| Route | What it does |
|---|---|
| `/` | Search + entry points (course, skill, room, equipment) |
| `/courses/[pe151]` | Core equipment by room, "also useful" gear, gaps, printable pull list |
| `/skills` | Browse by movement skill (throwing, agility, balance…) |
| `/rooms/[code]` | Everything in a room |
| `/audit/[code]` | Phone count screen for a room |
| `/audits` | Count history and the acceptable-loss margin |
| `/items/new` | Log a new delivery |
| `/labels` | Printable QR door labels |
| `/retired` | Disposal log |
