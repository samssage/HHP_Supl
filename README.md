# HHP Equipment Finder

Web app for York College's Health & Human Performance department. Faculty look up any PE skills
course, movement skill, room or item and see what equipment exists and exactly where it's stored.
Staff count storage rooms from their phones (QR label on the door → count screen) to keep the
inventory verified..

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

## Accounts and access

Anyone can create an account and, after confirming their email, browse inventory and submit equipment requests. Each member sees only their own requests. Staff can manage all requests, edit inventory, count rooms, and handle sign-outs and staging. Checkout names, staging notes, and count history remain restricted to staff.

The initial administrator is the confirmed Supabase account for `sams.frede@gmail.com`. This is checked against the current user returned by Supabase, not a submitted form or editable profile. `HHP_ADMIN_EMAIL` can override the initial administrator email on another deployment. Accounts with administrator-controlled `app_metadata.hhp_staff = true` or `app_metadata.hhp_admin = true` also have staff access. Public signups never grant these metadata roles.

1. Configure the Supabase URL, server-only database secret and public publishable/anon login key in Vercel (see `.env.example`), then redeploy.
2. In Supabase Authentication → Sign In / Providers, allow new users to sign up and keep email confirmation enabled.
3. Under URL Configuration, allow `https://YOUR_APP_DOMAIN/auth/callback` for each production domain people use. Set the Site URL to the primary production domain followed by `/auth/callback`, so dashboard invitations and password recovery also work. Signup requests include their own origin as the callback; Supabase validates it against the allowlist.
4. Sam opens `/login`, selects **Create an account**, uses `sams.frede@gmail.com`, chooses his own password, and confirms his email. Once confirmed, the app recognizes him as administrator automatically. Existing confirmed accounts can sign in directly.

Passwords are entered by the account owner. Do not put passwords or service-role keys in code or chat. The old shared HHP_STAFF_USER/PASSWORD variables are no longer used.

The proxy refreshes sessions and redirects anonymous visitors to login. Inventory writes independently verify staff access; reads require a confirmed account. Request ownership is set server-side from the verified user ID, and the user's account email overrides any submitted address. Database tables and RPCs remain inaccessible to browser roles.

Additional staff can be granted a role through Supabase's admin API or SQL Editor after the administrator approves their email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"hhp_staff":true}'::jsonb
where lower(email) = lower('APPROVED_STAFF_EMAIL')
returning id, email;
```

To revoke staff access, remove the metadata grant; to change the initial administrator, change HHP_ADMIN_EMAIL and redeploy. Password reset emails can be sent from Supabase's user dashboard and return to the password setup screen.

## Pages

| Route | What it does |
|---|---|
| `/` | Public introduction, three-step walkthrough, login and signup links |
| `/dashboard` | Signed-in search + entry points (course, skill, room, equipment) |
| `/login?mode=signup` | Open the account creation form directly |
| `/courses/[pe151]` | Core equipment by room, "also useful" gear, gaps, printable pull list |
| `/skills` | Browse by movement skill (throwing, agility, balance…) |
| `/rooms/[code]` | Everything in a room |
| `/audit/[code]` | Phone count screen for a room |
| `/audits` | Count history and the acceptable-loss margin |
| `/items/new` | Log a new delivery |
| `/labels` | Printable QR door labels |
| `/retired` | Disposal log |
