# Lucky Agent Game Repurpose Plan + Debug Mode

## Summary
Repurpose this Vue/Vite/Tailwind repo into a magic-link-auth idle gacha game hosted on GitHub Pages project path, with Supabase as the backend.
Core loop: buy/open eggs, collect AI/CS terms, level via duplicates, earn passive money, upgrade luck, and compete on a global leaderboard.
Add a secure debug mode for rapid testing, enabled by URL/local flag but enforced server-side via email allowlist.

## Plan Persistence
- Save this plan as `docs/IMPLEMENTATION_PLAN.md`.
- Keep it as the single source of truth for implementation tasks.

## Locked Product Decisions
- Auth required before play (Supabase magic link).
- Server-authoritative economy.
- GitHub Pages project deployment (`<user>.github.io/<repo>`).
- Tiered MVP progression from basics to AI/deep learning.
- Leaderboard included.
- Nickname system: 3-part customizable auto nickname + randomize.
- Luck effect: rarity odds + small yield boost.
- Offline earnings cap: 12 hours.
- UI direction: clean minimal + tech edge + slight pastel feel.
- Debug mode: URL + localStorage activation, full toolkit, production access only for allowlisted emails.

## App Architecture Changes
1. Routing + shell
- Switch router to hash history in `src/router/index.js`:
  - `createWebHashHistory(import.meta.env.BASE_URL)`.
- Routes:
  - `/` sign-in gate or redirect to `/game`
  - `/game` gameplay dashboard
  - `/leaderboard`
  - `/profile`
- Replace Netflix components with game-first shell/nav.

2. State (Vuex modules)
- `auth`: session/user/auth state.
- `game`: authoritative snapshot + local projected coins for UI.
- `leaderboard`: cached rankings (5 min TTL).
- `debug`: enabled flag, panel visibility, selected forced reward settings.

3. Supabase client/auth
- Upgrade to `@supabase/supabase-js` v2.
- Magic link via `signInWithOtp`.
- Session bootstrap:
  - `getSession` + `onAuthStateChange`.
- Redirect URL allowlist:
  - local dev + production GitHub Pages URL.

## Game Data + Economy Model
1. Static frontend catalog (low storage/cost)
- `src/data/terms.js`: fixed term pool, tiers, base yield, rarity.
- `src/data/eggs.js`: egg prices, tier unlocks, drop pools.

2. Server-authoritative actions (RPC-first)
- `bootstrap_player()`: create/load state + inventory + profile.
- `open_egg(p_tier int, p_debug_override jsonb default null)`: apply offline earnings, validate funds/unlocks, roll reward, apply duplicate leveling, return updated snapshot + draw.
- `upgrade_luck()`: apply offline earnings, deduct cost, increment luck.
- `update_nickname(p_a text, p_b text, p_c text)`.
- `get_leaderboard(p_limit int default 50)`.

3. Passive earnings strategy
- Server computes earnings from `last_tick_at`, capped at 12h.
- Client shows projected live coins between server actions without polling.

## Supabase Schema
1. `player_state`
- `user_id` PK (auth.users FK)
- `coins bigint`
- `luck_level int`
- `passive_rate_bp int`
- `highest_tier_unlocked int`
- `eggs_opened int`
- `last_tick_at timestamptz`
- timestamps

2. `player_terms`
- PK `(user_id, term_key)`
- `copies int`
- `level int`
- `updated_at`

3. `player_profile`
- `user_id` PK
- `nick_part_a`, `nick_part_b`, `nick_part_c`, `display_name`
- `updated_at`

4. `debug_allowlist`
- `email text primary key`
- used to authorize debug actions in production.

5. `leaderboard_v1` view
- rank/display_name/score/luck/highest tier/updated_at (no PII).

## RLS + Security
- RLS on all player tables.
- User can only read/write their own rows.
- Leaderboard exposes only safe fields.
- Debug authorization is enforced in SQL functions:
  - check `auth.jwt()->>'email'` exists in `debug_allowlist`.
  - reject debug overrides when unauthorized.

## Debug Mode Spec
1. Activation
- `?debug=1` sets localStorage `lucky_debug=1`.
- `?debug=0` clears it.
- UI reads localStorage + URL param.
- Debug panel appears only when signed in and debug flag true.

2. Production safety
- Panel may render, but all mutating debug RPC calls require allowlisted email.
- Unauthorized debug calls return clear error; no silent fallback.

3. Debug toolkit actions
- Add coins.
- Set coins.
- Set luck level.
- Grant term copies by `term_key`.
- Force next egg outcome by tier/rarity/term key.
- Reset account progression.

4. Debug API surface
- `debug_apply_action(action jsonb)` centralizes authorization and action handling.

5. UI
- `DebugPanel.vue` accessible from `/game`.
- Controls include quick presets and a JSON preview of server snapshot.
- Action responses reuse normal snapshot reconciliation path.

## GitHub Pages Deployment
- Add workflow `/.github/workflows/deploy.yml` for build + Pages publish.
- Set Vite `base` to repo path for project pages.
- Hash routing avoids 404 deep-link issues.

## Public Interface Changes
- Frontend service calls:
  - `auth.sendMagicLink(email)`
  - `auth.signOut()`
  - `game.bootstrapPlayer()`
  - `game.openEgg(tier, debugOverride?)`
  - `game.upgradeLuck()`
  - `profile.updateNickname(parts)`
  - `leaderboard.fetch(limit)`
  - `debug.apply(action)`

## Test Plan
1. Auth/session
- Magic link send, callback, persistent session, sign-out.

2. Economy correctness
- Egg purchase + reward + duplicate leveling.
- Luck upgrade costs/effects.
- Offline earnings cap at 12h.
- No negative balances or invalid tier access.

3. Debug authorization
- Allowlisted user can execute all debug actions.
- Non-allowlisted user cannot mutate via debug.
- Forced reward works only when authorized.

4. Security/RLS
- Cross-user reads/writes blocked.
- Leaderboard has no private identifiers.

5. Deployment/runtime
- GitHub Pages URL works with hash routes.
- Supabase redirect returns user to app and session hydrates.

## Assumptions and Defaults
- Initial coins: 100.
- Static catalog shipped in app source for MVP.
- No storage buckets/files.
- No realtime subscriptions.
- Leaderboard fetched on view open and cached 5 minutes.
- Sentry disabled in MVP.
