import { supabase } from '../lib/supabase'

const RPC_TIMEOUT_MS = 15000
const OPEN_PACK_TIMEOUT_MS = 6000
const OPEN_PACK_RETRY_TIMEOUT_MS = 12000
const OPEN_PACK_RETRY_DELAY_MS = 180

function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, Math.max(0, Number(ms || 0)))
  })
}

async function withRpcTimeout(promise, actionLabel = 'request', timeoutMs = RPC_TIMEOUT_MS) {
  let timeoutId = null

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = globalThis.setTimeout(() => {
          reject(new Error(`${actionLabel} timed out after ${timeoutMs / 1000}s. Please try again.`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId != null) {
      globalThis.clearTimeout(timeoutId)
    }
  }
}

function unwrap(result) {
  if (result.error) {
    throw result.error
  }

  return result.data
}

function isMissingRpcError(error, functionName) {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '').toLowerCase()

  if (code === 'PGRST202' || code === '42883') return true
  return message.includes('function') && message.includes(functionName)
}

function isTimeoutError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('timed out') || message.includes('timeout')
}

export async function bootstrapPlayer() {
  return unwrap(await withRpcTimeout(supabase.rpc('bootstrap_player'), 'bootstrap_player'))
}

export async function fetchRuntimeCapabilities() {
  const primary = await withRpcTimeout(supabase.rpc('get_runtime_capabilities'), 'get_runtime_capabilities')

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'get_runtime_capabilities')) {
    throw primary.error
  }

  // Legacy backends may not expose capabilities yet.
  return {
    supports_rebirth: true,
    supports_lifetime_collection: true,
    supports_season_history: true,
    economy_version: 'legacy-server',
    config: {},
  }
}

export async function keepAlive() {
  const primary = await withRpcTimeout(supabase.rpc('keep_alive'), 'keep_alive')

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'keep_alive')) {
    throw primary.error
  }

  return null
}

export async function openPack({ source = 'manual', debugOverride = null } = {}) {
  async function runOpenPackOnce(timeoutMs) {
    const primary = await withRpcTimeout(supabase.rpc('open_pack', {
      p_source: source,
      p_debug_override: debugOverride,
    }), 'open_pack', timeoutMs)

    if (!primary.error) {
      return primary.data
    }

    if (!isMissingRpcError(primary.error, 'open_pack')) {
      throw primary.error
    }

    const fallbackTier = Number(debugOverride?.tier || 1)
    return unwrap(await withRpcTimeout(supabase.rpc('open_egg', {
      p_egg_tier: Math.max(1, Math.min(6, fallbackTier)),
      p_debug_override: debugOverride,
    }), 'open_egg', timeoutMs))
  }

  try {
    return await runOpenPackOnce(OPEN_PACK_TIMEOUT_MS)
  } catch (error) {
    if (!isTimeoutError(error)) {
      throw error
    }

    // Transient DB stalls can recover without full app restart.
    await sleep(OPEN_PACK_RETRY_DELAY_MS)
    try {
      await withRpcTimeout(supabase.rpc('keep_alive'), 'keep_alive', 8000)
    } catch (_) {
      // Best effort only; keep retrying open_pack.
    }

    return runOpenPackOnce(OPEN_PACK_RETRY_TIMEOUT_MS)
  }
}

export async function loseCard(termKey) {
  const normalized = String(termKey || '').trim()
  if (!normalized) {
    throw new Error('Missing term key')
  }

  const primary = await withRpcTimeout(supabase.rpc('lose_card', {
    p_term_key: normalized,
  }), 'lose_card')

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'lose_card')) {
    throw primary.error
  }

  throw new Error('Card loss RPC is not available on this backend yet')
}

export async function buyUpgrade({ upgradeKey } = {}) {
  const primary = await withRpcTimeout(supabase.rpc('buy_upgrade', {
    p_upgrade_key: upgradeKey,
  }), 'buy_upgrade')

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'buy_upgrade')) {
    throw primary.error
  }

  if (upgradeKey === 'luck_engine' || upgradeKey === 'value_upgrade') {
    return unwrap(await withRpcTimeout(supabase.rpc('upgrade_luck'), 'upgrade_luck'))
  }

  throw new Error('buy_upgrade RPC is not available on this backend yet')
}

export async function buyMissingCardGift() {
  const primary = await withRpcTimeout(supabase.rpc('buy_missing_card_gift'), 'buy_missing_card_gift')

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'buy_missing_card_gift')) {
    throw primary.error
  }

  throw new Error('buy_missing_card_gift RPC is not available on this backend yet')
}

// Backward-compatible wrappers for older callers.
export async function openEgg(tier, debugOverride = null) {
  const normalizedTier = Math.max(1, Math.min(6, Number(tier || 1)))
  const override = {
    ...(debugOverride || {}),
  }

  if (override.tier == null) {
    override.tier = normalizedTier
  }

  return openPack({ source: 'manual', debugOverride: override })
}

export async function upgradeLuck() {
  return buyUpgrade({ upgradeKey: 'value_upgrade' })
}

export async function updateNickname(parts) {
  return unwrap(await withRpcTimeout(supabase.rpc('update_nickname', {
    p_display_name: parts.displayName,
  }), 'update_nickname'))
}

export async function submitNameReport({ reportedName, details = '' } = {}) {
  return unwrap(await withRpcTimeout(supabase.rpc('submit_name_report', {
    p_reported_name: reportedName,
    p_notes: details,
  }), 'submit_name_report'))
}

export async function resetAccount() {
  const primary = await withRpcTimeout(supabase.rpc('reset_account'), 'reset_account')

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'reset_account')) {
    throw primary.error
  }

  return unwrap(await withRpcTimeout(supabase.rpc('debug_apply_action', {
    p_action: { type: 'reset_account' },
  }), 'debug_apply_action'))
}

export async function fetchLeaderboard(limit = 50) {
  return unwrap(await withRpcTimeout(supabase.rpc('get_leaderboard', {
    p_limit: limit,
  }), 'get_leaderboard'))
}

export async function rebirthPlayer() {
  return unwrap(await withRpcTimeout(supabase.rpc('rebirth_player'), 'rebirth_player'))
}

export async function fetchLifetimeCollection() {
  return unwrap(await withRpcTimeout(supabase.rpc('get_lifetime_collection'), 'get_lifetime_collection'))
}

export async function fetchSeasonHistory(limit = 200) {
  return unwrap(await withRpcTimeout(supabase.rpc('get_season_history', {
    p_limit: limit,
  }), 'get_season_history'))
}

export async function fetchDuckCaveStash() {
  const primary = await withRpcTimeout(supabase.rpc('get_duck_cave_stash'), 'get_duck_cave_stash')

  if (!primary.error) {
    return primary.data || []
  }

  if (!isMissingRpcError(primary.error, 'get_duck_cave_stash')) {
    throw primary.error
  }

  const fallback = await withRpcTimeout(supabase.rpc('get_duck_cave_stash', {
    p_limit: 5000,
  }), 'get_duck_cave_stash')
  if (!fallback.error) {
    return fallback.data || []
  }

  if (!isMissingRpcError(fallback.error, 'get_duck_cave_stash')) {
    throw fallback.error
  }

  return []
}

export async function debugApply(action) {
  return unwrap(await withRpcTimeout(supabase.rpc('debug_apply_action', {
    p_action: action,
  }), 'debug_apply_action'))
}
