# Lucky Dev Bug Log (Codex)

Last updated: 2026-02-27

## How to read this
- `Status`: `Fixed`, `Mitigated`, or `Open`
- `Area`: where the bug showed up
- `Symptom`: what users saw
- `Root cause`: underlying issue
- `Resolution`: what was changed

## 1) Deploy / Routing / Auth

### B-001
- Status: Fixed
- Area: GitHub Pages deploy
- Symptom: site stuck redirecting / 404 on hosted URL
- Root cause: incorrect Vite base path for subdirectory deploy
- Resolution: configured base path for repo subpath and updated auth redirect URLs

### B-002
- Status: Fixed
- Area: Money Flip duck assets (remote only)
- Symptom: duck image worked locally but not on remote
- Root cause: hardcoded absolute asset paths (`/ducks/...`) ignored Pages subpath
- Resolution: switched to `import.meta.env.BASE_URL` asset helper

## 2) Supabase / Email / Auth Delivery

### B-010
- Status: Mitigated (config-side)
- Area: Supabase magic link
- Symptom: `/auth/v1/otp` returning 500; magic link send failed
- Root cause: SMTP/sender config mismatch (sender identity/domain not aligned)
- Resolution: reverted problematic setup and clarified SMTP/sender requirements

## 3) Timeouts / Sync / Runtime Stability

### B-020
- Status: Fixed
- Area: Pack opening
- Symptom: `open_pack timed out after 6s`
- Root cause: transient RPC stalls
- Resolution: keep existing restart script as fallback; added in-app recovery behavior

### B-021
- Status: Fixed
- Area: Card loss action
- Symptom: `lose_card timed out after 15s`
- Root cause: RPC timeout/retry gaps
- Resolution: aligned handling with robust retry/recovery approach used for other actions

### B-022
- Status: Fixed
- Area: Lifetime/leaderboard fetches
- Symptom: first load timeouts (`get_lifetime_collection timed out`)
- Root cause: avoidable request pressure from overlapping keep-alive patterns
- Resolution: reduced unnecessary overlap and adjusted page data flow

## 4) Economy / Progression / Passive Income

### B-030
- Status: Fixed
- Area: Passive income scope
- Symptom: passive progress advanced while user was not on Game page
- Root cause: non-Game flows and nav keep-alive touched activity/progress paths
- Resolution: removed passive progress advancement from non-Game flows and disabled nav keep-alive progression outside Game

### B-031
- Status: Fixed
- Area: Mutation upgrade pricing
- Symptom: desired scaling/caps not applying as intended
- Root cause: cost curve and floor behavior mismatch
- Resolution: adjusted cost progression and floor logic for higher mutation tiers

## 5) Money Flip (v2) Gameplay Logic

### B-040
- Status: Fixed
- Area: Dealing fairness
- Symptom: unpicked choice cards were not returned before turn/river
- Root cause: turn/river pre-drawn too early
- Resolution: changed to resolve-time dealing from shuffled remaining deck + unpicked options

### B-041
- Status: Fixed
- Area: Tie outcomes
- Symptom: equal hand strengths did not refund wager
- Root cause: tie not handled explicitly in resolve path
- Resolution: added push behavior (`net_change = 0`), no won/lost increment on tie, plus regression test

### B-042
- Status: Fixed
- Area: Hand evaluator
- Symptom: full house scenarios sometimes scored incorrectly (duck winning invalidly)
- Root cause: SQL evaluator incorrectly required 5 unique ranks (invalid for full house/quads)
- Resolution: changed gate to valid-card-count check; verified full house vs pair case

### B-043
- Status: Fixed
- Area: Dealing randomness (server)
- Symptom: cards appeared in deterministic order (e.g., spades sequence)
- Root cause: position numbering performed before random ordering
- Resolution: use `row_number() over (order by random())` in dealing CTEs

### B-044
- Status: Fixed
- Area: Villain reveal timing
- Symptom: duck card revealed too early or both cards appeared together
- Root cause: UI sourced villain cards from resolved payload before staged reveal gating
- Resolution: staged preview state + reveal count gating (`>=1`, `>=2`) after river

### B-045
- Status: Fixed
- Area: Round restart flow
- Symptom: user needed to click `Play Again` before `Start Hand`
- Root cause: start gating bound to idle-only path
- Resolution: start-hand now hard-resets round UI state and can begin fresh immediately

## 6) UI / UX Defects

### B-050
- Status: Fixed
- Area: Login page background
- Symptom: visual split/green tinge/cutoff artifacts
- Root cause: layered background effects and section sizing mismatch
- Resolution: adjusted background layering and removed conflicting diffusion overlays

### B-051
- Status: Fixed
- Area: Card title rendering
- Symptom: long card names clipped across collection/game cards
- Root cause: fixed text sizing with no adaptive scaling
- Resolution: implemented automatic title scaling behavior and updated card layout

### B-052
- Status: Fixed
- Area: Profile performance toggle placement/visibility
- Symptom: toggle location/text visibility not matching requested UX
- Root cause: initial placement and switch text layering/padding
- Resolution: moved toggle to Profile flow order and adjusted switch sizing/padding/label behavior

## 7) Data / Leaderboards / Season Views

### B-060
- Status: Fixed
- Area: Money Flip leaderboard stats
- Symptom: ambiguous best/worst net labels and sign confusion
- Root cause: insufficient metric separation
- Resolution: split into `Most Gambled`, `Most Won`, `Most Lost`, `Top Net`; tracked won/lost explicitly in schema + local fallback

### B-061
- Status: Fixed
- Area: Completion timestamp ordering
- Symptom: completion times appeared duplicated/out of expected order
- Root cause: ordering/backfill consistency issues
- Resolution: updated ordering by first completion time and corrected backfill path

---

## Notes for future entries
- Add new bugs as `B-XXX` in chronological order.
- Include exact failing message if available.
- Record whether fix required:
  - frontend only,
  - local fallback only,
  - Supabase schema/RPC change,
  - or all three.
