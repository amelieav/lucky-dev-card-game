import test from 'node:test'
import assert from 'node:assert/strict'
import {
  bootstrapLocalPlayer,
  debugApplyLocal,
  openLocalEgg,
  updateLocalNickname,
  upgradeLocalLuck,
} from '../src/lib/localEconomy.mjs'

function user(id) {
  return {
    id,
    email: `${id}@example.com`,
  }
}

test('bootstrap creates a local snapshot with defaults', () => {
  const snapshot = bootstrapLocalPlayer(user('local-bootstrap'), { nowMs: 1_000 })
  assert.equal(snapshot.state.coins, 100)
  assert.equal(snapshot.state.luck_level, 0)
  assert.equal(snapshot.state.highest_tier_unlocked, 1)
  assert.equal(snapshot.terms.length, 0)
})

test('forced duplicate draws increase copies and level', () => {
  const account = user('local-duplicates')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 1_000 })

  for (let i = 0; i < 4; i += 1) {
    openLocalEgg(account, {
      tier: 1,
      debugAllowed: true,
      debugOverride: { tier: 1, term_key: 'if_statement' },
      nowMs: 2_000 + i,
    })
  }

  const snapshot = bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 3_000 })
  const ifStatement = snapshot.terms.find((row) => row.term_key === 'if_statement')

  assert.equal(snapshot.state.coins, 0)
  assert.equal(ifStatement?.copies, 4)
  assert.equal(ifStatement?.level, 2)
})

test('idle income applies with 12h cap and current passive rate', () => {
  const account = user('local-idle')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  debugApplyLocal(
    account,
    { type: 'grant_term', term_key: 'if_statement', copies: 1 },
    { debugAllowed: true, nowMs: 0 },
  )

  const snapshot = bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 2_000 })

  assert.equal(snapshot.state.coins, 101)
  assert.equal(snapshot.state.passive_rate_bp, 5000)
})

test('luck upgrade spends coins and increments level', () => {
  const account = user('local-luck-upgrade')
  bootstrapLocalPlayer(account, { debugAllowed: true, nowMs: 0 })

  debugApplyLocal(account, { type: 'add_coins', amount: 1000 }, { debugAllowed: true, nowMs: 0 })

  const result = upgradeLocalLuck(account, { debugAllowed: true, nowMs: 1_000 })
  assert.equal(result.snapshot.state.luck_level, 1)
  assert.equal(result.snapshot.state.coins, 1020)
})

test('nickname updates are validated and persisted', () => {
  const account = user('local-nickname')
  bootstrapLocalPlayer(account, { nowMs: 0 })

  const result = updateLocalNickname(
    account,
    { partA: 'Neon', partB: 'Tensor', partC: 'Nova' },
    { nowMs: 1_000 },
  )

  assert.equal(result.snapshot.profile.display_name, 'Neon Tensor Nova')
})
