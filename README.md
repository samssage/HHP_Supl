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
Production requires Supabase and staff access configuration.

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
