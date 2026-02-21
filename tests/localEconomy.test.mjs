import test from 'node:test'
import assert from 'node:assert/strict'
import {
  bootstrapLocalPlayer,
  buyLocalUpgrade,
  debugApplyLocal,
  openLocalPack,
  syncLocalPlayer,
  updateLocalNickname,
} from '../src/lib/localEconomy.mjs'

function user(id) {
  return {
    id,
    email: `${id}@example.com`,
  }
}

test('bootstrap creates a local snapshot with pack defaults', () => {
  const snapshot = bootstrapLocalPlayer(user('pack-bootstrap'), { nowMs: 1_000 })
  assert.equal(snapshot.state.coins, 100)
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
  assert.ok(result.snapshot.state.coins > 100)
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

test('nickname updates are validated and persisted', () => {
  const account = user('pack-nickname')
  bootstrapLocalPlayer(account, { nowMs: 0 })

  const result = updateLocalNickname(
    account,
    { partA: 'Agile', partB: 'Fox', partC: 'Nova' },
    { nowMs: 1_000 },
  )

  assert.equal(result.snapshot.profile.display_name, 'Agile Fox Nova')
})
