# Lucky Agent

Lucky Agent is a Vue 3 + Supabase card opening game with progression, collection tracking, passive income, and a global leaderboard.

## Core features
- Single-pack opening loop with manual and unlockable auto opening.
- Card outcomes driven by:
  - Tier odds (`tier_boost` upgrade)
  - Rarity odds (`value` upgrade, applied tier-by-tier)
  - Mutation odds (`mutation` upgrade)
- 6 tiers of cards, with rarity and mutation affecting value.
- Foil/Holo mutations grant permanent passive coins per second.
- Card Book view with discovered slots, copies, and best mutation.
- Rebirth loop after a full collection, with extra card layers and higher upgrade costs.
- Lifetime Collection tab to compare current layer progress against all-time layered collection.
- Leaderboard ranking by highest card quality and copies of that card.
- Weekly leaderboard seasons (global Monday UTC reset) with season history.
- Leaderboard auto-refreshes every 15 seconds with on-page countdown.
- Top status metrics (including coins and leaderboard position) update live while you play.
- Legendary full-page purple sparkle celebration effect.

## Tech stack
- Vue 3 + Vuex + Vue Router
- Vite + Tailwind
- Supabase Auth + Postgres RPC

## Local development
1. Install dependencies
```bash
npm install
```

2. Create env file
```bash
cp .env.example .env
```

3. Fill required variables in `.env`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL` (direct Postgres connection string for schema setup)
- Optional: `VITE_LOCAL_ECONOMY=1` for local-only economy simulation
- Optional: `VITE_SEASON_DURATION_MS=604800000` (7 days, default)

4. Apply DB schema
```bash
npm run setup-db
```

5. Run dev server
```bash
npm run dev
```

## Scripts
- `npm run dev` - start Vite dev server
- `npm test` - run node test suite (`tests/*.test.mjs`)
- `npm run build` - production build
- `npm run sync-schema` - refresh generated schema sections from source data files
- `npm run setup-db` - sync generated schema sections and apply `supabase/schema.sql` via `psql`

## Supabase auth setup
Configure redirect/allowlist URLs in Supabase Auth:
- Local: `http://localhost:5173/`
- Production (GitHub Pages): `https://<user>.github.io/<repo>/`

## Debug mode
Append query params in URL:
- `?debug=1` to enable
- `?debug=0` to disable

Debug actions are restricted by `public.debug_allowlist`.

Example allowlist entry:
```sql
insert into public.debug_allowlist(email) values ('you@example.com');
```

## Database operations
### Reapply schema safely
Run:
```bash
npm run setup-db
```

### Reset all test profiles and sign-ins
Use:
- `supabase/reset_all_profiles.sql`

This removes all `auth.users` rows plus gameplay/profile data tables.

## Local economy mode (fast balancing)
Set:
```bash
VITE_LOCAL_ECONOMY=1
```

In this mode:
- Economy runs from browser local storage per signed-in user
- Leaderboard is local-only
- Runtime is best-effort for development only (server RPC remains authoritative)
- Advanced server features are intentionally disabled (`rebirth`, `lifetime collection`, `season history`)
- You can quickly tune balance files without server RPC round-trips
- Season timer can be shortened with `VITE_SEASON_DURATION_MS=60000` for minute-level reset testing

Key files:
- `src/lib/balanceConfig.mjs`
- `src/lib/packLogic.mjs`
- `src/data/terms.mjs`

## Deployment
GitHub Pages workflow: `.github/workflows/deploy.yml`

Repository secrets required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
