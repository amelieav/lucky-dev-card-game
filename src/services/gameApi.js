import { supabase } from '../lib/supabase'

function unwrap(result) {
  if (result.error) {
    throw result.error
  }

  return result.data
}

export async function bootstrapPlayer() {
  return unwrap(await supabase.rpc('bootstrap_player'))
}

export async function openEgg(tier, debugOverride = null) {
  return unwrap(await supabase.rpc('open_egg', {
    p_egg_tier: tier,
    p_debug_override: debugOverride,
  }))
}

export async function upgradeLuck() {
  return unwrap(await supabase.rpc('upgrade_luck'))
}

export async function updateNickname(parts) {
  return unwrap(await supabase.rpc('update_nickname', {
    p_a: parts.partA,
    p_b: parts.partB,
    p_c: parts.partC,
  }))
}

export async function fetchLeaderboard(limit = 50) {
  return unwrap(await supabase.rpc('get_leaderboard', {
    p_limit: limit,
  }))
}

export async function debugApply(action) {
  return unwrap(await supabase.rpc('debug_apply_action', {
    p_action: action,
  }))
}
