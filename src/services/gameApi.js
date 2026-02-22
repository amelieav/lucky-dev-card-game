import { supabase } from '../lib/supabase'

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

export async function bootstrapPlayer() {
  return unwrap(await supabase.rpc('bootstrap_player'))
}

export async function keepAlive() {
  const primary = await supabase.rpc('keep_alive')

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'keep_alive')) {
    throw primary.error
  }

  return null
}

export async function openPack({ source = 'manual', debugOverride = null } = {}) {
  const primary = await supabase.rpc('open_pack', {
    p_source: source,
    p_debug_override: debugOverride,
  })

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'open_pack')) {
    throw primary.error
  }

  const fallbackTier = Number(debugOverride?.tier || 1)
  return unwrap(await supabase.rpc('open_egg', {
    p_egg_tier: Math.max(1, Math.min(6, fallbackTier)),
    p_debug_override: debugOverride,
  }))
}

export async function loseCard(termKey) {
  const normalized = String(termKey || '').trim()
  if (!normalized) {
    throw new Error('Missing term key')
  }

  const primary = await supabase.rpc('lose_card', {
    p_term_key: normalized,
  })

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'lose_card')) {
    throw primary.error
  }

  throw new Error('Card loss RPC is not available on this backend yet')
}

export async function buyUpgrade({ upgradeKey } = {}) {
  const primary = await supabase.rpc('buy_upgrade', {
    p_upgrade_key: upgradeKey,
  })

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'buy_upgrade')) {
    throw primary.error
  }

  if (upgradeKey === 'luck_engine' || upgradeKey === 'value_upgrade') {
    return unwrap(await supabase.rpc('upgrade_luck'))
  }

  throw new Error('buy_upgrade RPC is not available on this backend yet')
}

export async function buyMissingCardGift() {
  const primary = await supabase.rpc('buy_missing_card_gift')

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
  return unwrap(await supabase.rpc('update_nickname', {
    p_display_name: parts.displayName,
  }))
}

export async function submitNameReport({ reportedName, details = '' } = {}) {
  return unwrap(await supabase.rpc('submit_name_report', {
    p_reported_name: reportedName,
    p_notes: details,
  }))
}

export async function resetAccount() {
  const primary = await supabase.rpc('reset_account')

  if (!primary.error) {
    return primary.data
  }

  if (!isMissingRpcError(primary.error, 'reset_account')) {
    throw primary.error
  }

  return unwrap(await supabase.rpc('debug_apply_action', {
    p_action: { type: 'reset_account' },
  }))
}

export async function fetchLeaderboard(limit = 50) {
  return unwrap(await supabase.rpc('get_leaderboard', {
    p_limit: limit,
  }))
}

export async function rebirthPlayer() {
  return unwrap(await supabase.rpc('rebirth_player'))
}

export async function fetchLifetimeCollection() {
  return unwrap(await supabase.rpc('get_lifetime_collection'))
}

export async function fetchSeasonHistory(limit = 200) {
  return unwrap(await supabase.rpc('get_season_history', {
    p_limit: limit,
  }))
}

export async function debugApply(action) {
  return unwrap(await supabase.rpc('debug_apply_action', {
    p_action: action,
  }))
}
