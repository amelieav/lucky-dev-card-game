import test from 'node:test'
import assert from 'node:assert/strict'
import {
  bootstrapLocalPlayer,
  buyLocalMissingCardGift,
  buyLocalUpgrade,
  debugApplyLocal,
  getLocalRuntimeCapabilities,
  getLocalLifetimeCollection,
  getLocalSeasonHistory,
  keepAliveLocalPlayer,
  loseLocalCard,
  openLocalPack,
  rebirthLocalPlayer,
  resolveLocalMoneyFlip,
  startLocalMoneyFlip,
  syncLocalPlayer,
  updateLocalNickname,
} from '../src/lib/localEconomy.mjs'
import { TERMS, TERMS_BY_KEY } from '../src/data/terms.mjs'

function user(id) {
  return {
    id,
    email: `${id}@example.com`,
  }
}

test('local runtime capabilities mirror production feature surfaces', () => {
  const caps = getLocalRuntimeCapabilities()
  assert.equal(caps.supports_rebirth, true)
  assert.equal(caps.supports_lifetime_collection, true)
  assert.equal(caps.supports_season_history, true)
  assert.equal(caps.economy_version, 'local-dev-fallback')
  assert.deepEqual(caps.config, {})
})

test('bootstrap creates a local snapshot with pack defaults', () => {
  const snapshot = bootstrapLocalPlayer(user('pack-bootstrap'), { nowMs: 1_000 })
  assert.equal(snapshot.state.coins, 0)
  assert.equal(snapshot.state.value_level, 0)
  assert.equal(snapshot.state.packs_opened, 0)
  assert.equal(snapshot.state.auto_unlocked, false)
})

test('manual pack open is free and awards coins', () => {
  const account = user('pack-open')
  bootstrapLocalPlayer(account, { nowMs: 0 })

  const result = openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: {
      tier: 1,
      term_key: 'hello_world',
      rarity: 'common',
      mutation: 'none',
    },
    nowMs: 1_000,
  })

  assert.equal(result.snapshot.state.packs_opened, 1)
  assert.equal(result.snapshot.state.manual_opens, 1)
  assert.ok(result.snapshot.state.coins > 0)
  assert.equal(result.draw.reward, 3)
})

test('duplicates increase copies and level', () => {
  const account = user('pack-duplicates')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  for (let i = 0; i < 4; i += 1) {
    openLocalPack(account, {
      source: 'manual',
      debugAllowed: true,
      debugOverride: { tier: 1, term_key: 'hello_world', rarity: 'common', mutation: 'none' },
      nowMs: 1_000 + i,
    })
  }

  const snapshot = bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 2_000 })
  const row = snapshot.terms.find((term) => term.term_key === 'hello_world')

  assert.equal(row?.copies, 4)
  assert.equal(row?.level, 2)
})

test('collection tracks highest mutation received per card', () => {
  const account = user('pack-best-mutation')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 1, term_key: 'hello_world', rarity: 'common', mutation: 'foil' },
    nowMs: 1_000,
  })

  openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 1, term_key: 'hello_world', rarity: 'common', mutation: 'none' },
    nowMs: 2_000,
  })

  openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 1, term_key: 'hello_world', rarity: 'common', mutation: 'holo' },
    nowMs: 3_000,
  })

  const snapshot = bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 4_000 })
  const row = snapshot.terms.find((term) => term.term_key === 'hello_world')

  assert.equal(row?.best_mutation, 'holo')
})

test('foil and holo mutations generate passive coins over time', () => {
  const account = user('pack-passive-income')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 1, term_key: 'hello_world', rarity: 'common', mutation: 'foil' },
    nowMs: 1_000,
  })

  const second = openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 1, term_key: 'stack_overflow', rarity: 'common', mutation: 'holo' },
    nowMs: 2_000,
  })

  const synced = syncLocalPlayer(account, { debugAllowed: true, nowMs: 6_000 })
  assert.equal(synced.snapshot.state.passive_rate_cps, 4)
  assert.equal(synced.snapshot.state.coins - second.snapshot.state.coins, 16)
})

test('passive income accrues only during active heartbeat windows', () => {
  const account = user('pack-active-window')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 1, term_key: 'hello_world', rarity: 'common', mutation: 'holo' },
    nowMs: 1_000,
  })

  const atFive = keepAliveLocalPlayer(account, { debugAllowed: true, nowMs: 5_000 })
  const atThirty = keepAliveLocalPlayer(account, { debugAllowed: true, nowMs: 30_000 })

  assert.equal(atFive.snapshot.state.passive_rate_cps, 3)
  assert.equal(atFive.snapshot.state.coins, 15)
  assert.equal(atThirty.snapshot.state.coins, 60)
})

test('losing a card removes it completely from collection', () => {
  const account = user('pack-loss')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 2, term_key: 'merge_conflict', rarity: 'common', mutation: 'holo' },
    nowMs: 1_000,
  })

  const lost = loseLocalCard(account, {
    termKey: 'merge_conflict',
    debugAllowed: true,
    nowMs: 2_000,
  })

  const row = lost.snapshot.terms.find((term) => term.term_key === 'merge_conflict')
  assert.equal(lost.loss.removed, true)
  assert.equal(row, undefined)
})

test('auto opener applies draws during sync ticks', () => {
  const account = user('pack-auto')
  bootstrapLocalPlayer(account, { nowMs: 0 })

  debugApplyLocal(account, { type: 'add_coins', amount: 2_000 }, { debugAllowed: true, nowMs: 0 })
  buyLocalUpgrade(account, { upgradeKey: 'auto_unlock', debugAllowed: true, nowMs: 0 })

  const synced = syncLocalPlayer(account, { debugAllowed: true, nowMs: 10_000 })

  assert.ok(synced.snapshot.state.auto_opens >= 2)
  assert.ok(synced.snapshot.state.packs_opened >= synced.snapshot.state.auto_opens)
  assert.ok(synced.snapshot.state.coins > 0)
})

test('shop upgrade purchase spends coins and increments level', () => {
  const account = user('pack-upgrades')
  bootstrapLocalPlayer(account, { nowMs: 0 })
  debugApplyLocal(account, { type: 'set_coins', amount: 5_000 }, { debugAllowed: true, nowMs: 0 })

  const result = buyLocalUpgrade(account, {
    upgradeKey: 'tier_boost',
    debugAllowed: true,
    nowMs: 1_000,
  })

  assert.equal(result.purchase.upgrade_key, 'tier_boost')
  assert.equal(result.snapshot.state.tier_boost_level, 1)
  assert.ok(result.snapshot.state.coins < 5_000)
})

test('missing card gift spends 25,000 coins and grants a missing card', () => {
  const account = user('pack-missing-gift')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })
  debugApplyLocal(account, { type: 'set_coins', amount: 35_000 }, { debugAllowed: true, nowMs: 0 })

  const result = buyLocalMissingCardGift(account, {
    debugAllowed: true,
    rng: () => 0,
    nowMs: 1_000,
  })

  assert.equal(result.snapshot.state.coins, 10_000)
  assert.equal(result.snapshot.terms.length, 1)
  assert.equal(result.gift.source, 'shop_gift')
  assert.equal(result.gift.term_key, 'hello_world')
})

test('missing card gift is blocked when current collection is complete', () => {
  const account = user('pack-missing-gift-complete')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })
  debugApplyLocal(
    account,
    { type: 'grant_full_set', coins: 200_000 },
    { debugAllowed: true, nowMs: 1_000 },
  )

  assert.throws(() => {
    buyLocalMissingCardGift(account, { debugAllowed: true, nowMs: 2_000 })
  }, /already complete/)
})

test('money flip settles wager against highest card pick', () => {
  const account = user('pack-money-flip')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })
  debugApplyLocal(account, { type: 'set_coins', amount: 10_000 }, { debugAllowed: true, nowMs: 100 })

  const started = startLocalMoneyFlip(account, {
    wager: 500,
    debugAllowed: true,
    nowMs: 200,
    rng: () => 0.42,
  })

  assert.ok(started.round.round_id)
  assert.equal(started.round.flop.length, 3)
  assert.equal(started.round.choice_options.length, 3)
  assert.equal(started.round.villain_hole.length, 2)
  assert.equal(started.snapshot.state.season_gambled_coins, 500)

  const resolved = resolveLocalMoneyFlip(account, {
    roundId: started.round.round_id,
    pickIndex: 0,
    debugAllowed: true,
    nowMs: 300,
  })

  assert.ok(resolved.result.won === true || resolved.result.won === false)
  assert.ok(Math.abs(Number(resolved.result.net_change || 0)) === 500)
  assert.ok([9_500, 10_500].includes(resolved.snapshot.state.coins))
  assert.equal(resolved.result.player_cards.length, 2)
  assert.equal(resolved.result.board.length, 5)
  assert.equal(resolved.snapshot.state.season_gambled_coins, 500)
  assert.equal(resolved.snapshot.state.season_gamble_rounds, 1)
  assert.ok(Math.abs(Number(resolved.snapshot.state.season_gamble_net_coins || 0)) === 500)
})

test('debug full set grants all cards and sets coins', () => {
  const account = user('pack-debug-full-set')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 2, term_key: 'merge_conflict', rarity: 'common', mutation: 'none' },
    nowMs: 1_000,
  })
  loseLocalCard(account, {
    termKey: 'merge_conflict',
    debugAllowed: true,
    nowMs: 2_000,
  })

  const result = debugApplyLocal(
    account,
    { type: 'grant_full_set', coins: 200_000 },
    { debugAllowed: true, nowMs: 3_000 },
  )

  assert.equal(result.snapshot.state.coins, 200_000)
  assert.equal(result.snapshot.terms.length, TERMS.length)
  assert.ok(!result.snapshot.stolen_terms.includes('merge_conflict'))
})

test('nickname updates are validated and persisted', () => {
  const account = user('pack-nickname')
  bootstrapLocalPlayer(account, { nowMs: 0 })

  const result = updateLocalNickname(
    account,
    { displayName: 'AgileFox_1' },
    { nowMs: 1_000 },
  )

  assert.equal(result.snapshot.profile.display_name, 'AgileFox_1')
  assert.equal(result.snapshot.profile.name_customized, true)
})

test('nickname validation blocks profanity and invalid characters', () => {
  const account = user('pack-nickname-validation')
  bootstrapLocalPlayer(account, { nowMs: 0 })
  const invalidNameMessage = /does not adhere with our rules/i

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'ab' }, { nowMs: 1_000 })
  }, invalidNameMessage)

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'bad name' }, { nowMs: 1_000 })
  }, invalidNameMessage)

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'Agent_12345' }, { nowMs: 1_000 })
  }, invalidNameMessage)

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'f_u_c_k' }, { nowMs: 1_000 })
  }, invalidNameMessage)

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'k_k_k' }, { nowMs: 1_000 })
  }, invalidNameMessage)

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'f_r_a_n_c_e' }, { nowMs: 1_000 })
  }, invalidNameMessage)

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'muslim_dev' }, { nowMs: 1_000 })
  }, invalidNameMessage)

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'palestine_1' }, { nowMs: 1_000 })
  }, invalidNameMessage)

  assert.throws(() => {
    updateLocalNickname(account, { displayName: 'immigrant99' }, { nowMs: 1_000 })
  }, invalidNameMessage)
})

test('rebirth requires full current collection', () => {
  const account = user('pack-rebirth-gate')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  assert.throws(() => {
    rebirthLocalPlayer(account, { debugAllowed: true, nowMs: 1_000 })
  }, /Rebirth requires full collection/)
})

test('rebirth resets current run but preserves lifetime collection', () => {
  const account = user('pack-rebirth-reset')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  for (const term of ['hello_world', 'merge_conflict']) {
    openLocalPack(account, {
      source: 'manual',
      debugAllowed: true,
      debugOverride: { tier: TERMS_BY_KEY[term].tier, term_key: term, rarity: TERMS_BY_KEY[term].rarity, mutation: 'none' },
      nowMs: term === 'hello_world' ? 1_000 : 1_001,
    })
  }

  // Fill the remaining cards quickly to satisfy rebirth gate.
  let tickMs = 2_000
  for (const term of Object.keys(TERMS_BY_KEY)) {
    openLocalPack(account, {
      source: 'manual',
      debugAllowed: true,
      debugOverride: { tier: TERMS_BY_KEY[term].tier, term_key: term, rarity: TERMS_BY_KEY[term].rarity, mutation: 'none' },
      nowMs: tickMs,
    })
    tickMs += 1
  }

  const rebirth = rebirthLocalPlayer(account, { debugAllowed: true, nowMs: 3_000 })
  assert.equal(rebirth.rebirth.rebirth_count, 1)
  assert.equal(rebirth.rebirth.to_layer, 2)
  assert.equal(rebirth.snapshot.state.coins, 0)
  assert.equal(rebirth.snapshot.terms.length, 0)

  const lifetime = getLocalLifetimeCollection(account, { nowMs: 3_100 })
  assert.ok(lifetime.total_unique >= Object.keys(TERMS_BY_KEY).length)
})

test('stolen card appears in stolen slots until recollected', () => {
  const account = user('pack-stolen-slot')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 2, term_key: 'merge_conflict', rarity: 'common', mutation: 'none' },
    nowMs: 1_000,
  })

  const lost = loseLocalCard(account, {
    termKey: 'merge_conflict',
    debugAllowed: true,
    nowMs: 2_000,
  })
  assert.equal(lost.loss.removed, true)
  assert.ok(lost.snapshot.stolen_terms.includes('merge_conflict'))

  const recollected = openLocalPack(account, {
    source: 'manual',
    debugAllowed: true,
    debugOverride: { tier: 2, term_key: 'merge_conflict', rarity: 'common', mutation: 'none' },
    nowMs: 3_000,
  })
  assert.ok(!recollected.snapshot.stolen_terms.includes('merge_conflict'))
})

test('season rollover archives history and resets progression', () => {
  const account = user('pack-season-reset')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  debugApplyLocal(account, { type: 'set_coins', amount: 9_999 }, { debugAllowed: true, nowMs: 1_000 })
  const nextWeekMs = 8 * 24 * 60 * 60 * 1000
  const afterRollover = bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: nextWeekMs })
  assert.equal(afterRollover.state.coins, 0)
  assert.equal(afterRollover.state.rebirth_count, 0)
  assert.equal(afterRollover.state.active_layer, 1)

  const history = getLocalSeasonHistory(account, { nowMs: nextWeekMs + 100 })
  assert.ok(history.length >= 1)
})
