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

## Deploy
GitHub Pages workflow is in `.github/workflows/deploy.yml`.

Set repository secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
