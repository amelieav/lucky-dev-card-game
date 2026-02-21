# Lucky Agent

Lucky Agent is a Vue 3 + Supabase card opening game with progression, collection tracking, passive income, and a global leaderboard.

## Core features
- Single-pack opening loop with manual and unlockable auto opening.
- Card outcomes driven by:
  - Tier odds (`tier_boost` upgrade)
  - Rarity odds (`value` upgrade)
  - Mutation odds (`mutation` upgrade)
- 6 tiers of cards, with rarity and mutation affecting value.
- Foil/Holo mutations grant permanent passive coins per second.
- Card Book view with discovered slots, copies, and best mutation.
- Leaderboard ranking by highest card quality and copies of that card.
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
- Optional: `VITE_LOCAL_ECONOMY=1` for local-only economy simulation

4. Apply DB schema
- Open Supabase SQL Editor
- Run `supabase/schema.sql`

5. Run dev server
```bash
npm run dev
```

## Scripts
- `npm run dev` - start Vite dev server
- `npm test` - run node test suite (`tests/*.test.mjs`)
- `npm run build` - production build
- `npm run sync-schema` - refresh generated schema sections from source data files

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
Run `supabase/schema.sql` in Supabase SQL Editor when updating RPC/view logic.

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
- You can quickly tune balance files without server RPC round-trips

Key files:
- `src/lib/balanceConfig.mjs`
- `src/lib/packLogic.mjs`
- `src/data/terms.mjs`

## Deployment
GitHub Pages workflow: `.github/workflows/deploy.yml`

Repository secrets required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
