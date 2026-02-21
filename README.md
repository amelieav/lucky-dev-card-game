# Lucky Agent

Lucky Agent is a lucky-draw idle game built with Vue 3 + Vite + Tailwind + Supabase.

## Gameplay
- Sign in with magic link.
- Buy/open egg tiers to unlock AI and software-engineering terms.
- Duplicates level up terms.
- Terms generate passive coins over time.
- Spend coins to increase luck (better rarity odds + small passive bonus).
- Compete on a global leaderboard.

## Local setup
1. Install dependencies.
```bash
npm install
```

2. Create `.env` from `.env.example` and fill Supabase credentials.
```bash
cp .env.example .env
```

3. Apply Supabase SQL schema and RPCs.
- Open Supabase SQL editor.
- Run `supabase/schema.sql`.

4. Start dev server.
```bash
npm run dev
```

## Supabase auth configuration
Configure Auth URL allowlist:
- Local: `http://localhost:5173/`
- Production: `https://<user>.github.io/<repo>/`

## Debug mode
- Enable: append `?debug=1` to URL.
- Disable: append `?debug=0`.
- Debug UI shows on `/game` only when signed in and debug flag is enabled.
- Mutating debug actions are server-guarded by `debug_allowlist` email entries.

To allow a production account:
```sql
insert into public.debug_allowlist(email) values ('you@example.com');
```

## Local balance mode (no schema reruns)
Use this when you want to tune prices/chances/luck quickly in frontend code first.

1. Set in `.env`:
```bash
VITE_LOCAL_ECONOMY=1
```
2. Restart `npm run dev`.
3. Tune values in:
- `src/lib/balanceConfig.mjs` (egg costs, unlock thresholds, hatch mix weights, rarity weights, luck bonus)
- `src/data/terms.js` (`baseBp` values per code-chick)

Notes:
- Auth still works with Supabase magic links.
- Game economy runs from local storage per signed-in user.
- Leaderboard becomes local-only while this mode is enabled.
- During `npm run dev`, updates to `src/data/terms.mjs`, `src/data/nicknameParts.mjs`, or `src/lib/balanceConfig.mjs` auto-sync generated sections in `supabase/schema.sql`.
- Run `npm run sync-schema` manually any time to refresh DB-facing schema data from local source files.
- Set `VITE_LOCAL_ECONOMY=0` to switch back to server-authoritative RPC economy.

## Deploy
GitHub Pages workflow is in `.github/workflows/deploy.yml`.

Set repository secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
