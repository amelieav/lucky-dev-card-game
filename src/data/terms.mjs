import { BALANCE_CONFIG } from '../lib/balanceConfig.mjs'

const TIER_NAMES = {
  1: [
    'Hello World',
    'Stack Overflow',
    'Console Log',
    'TODO Comment',
    'Off-by-One Error',
    'Infinite Loop',
    'Rubber Duck',
    'Missing Semicolon',
    'Copy-Paste Dev',
    'Git Commit',
  ],
  2: [
    'Merge Conflict',
    'npm Install',
    '404 Not Found',
    'Debugger Breakpoint',
    'JSON Parse Error',
    'API Timeout',
    'Version Mismatch',
    'Environment Variable',
    'Hotfix Friday',
    'Regex Attempt',
  ],
  3: [
    'Async Await',
    'REST API',
    'Unit Test',
    'Docker Container',
    'CI Pipeline',
    'Code Review',
    'Refactor',
    'Memory Leak',
    'SQL Injection',
    'Cache Miss',
  ],
  4: [
    'Microservices',
    'Distributed System',
    'Event Loop',
    'Race Condition',
    'Load Balancer',
    'Tech Debt',
    'Deadlock',
    'Observability',
    'Feature Flag',
    'Blue-Green Deploy',
  ],
  5: [
    'Compiler',
    'Kernel',
    'Zero-Day',
    'Concurrency Wizard',
    'Performance Tuning',
    'AI Model',
    'Bare Metal',
    'Scalability',
    'Production Hotfix',
    'Immutable Infrastructure',
  ],
  6: [
    'The Clean Code',
    'Infinite Uptime',
    'No Merge Conflicts',
    'Self-Healing System',
    'The Senior Who Knows Everything',
    'The One Who Uses Vim',
    'Linus Mode',
    'The Bug That Was Documentation',
    '100% Test Coverage',
    'It Works On First Try',
  ],
}

const TIER_ICON_SET = {
  1: ['print()', 'Q&A', 'log>', 'TODO', 'i+1', 'loop', 'duck', ';', 'copy', 'git'],
  2: ['<<<<', 'npm', '404', 'dbg', '{ }', 'api', 'v1.2', 'ENV', 'hotfix', '.*'],
  3: ['await', 'REST', 'test', 'ctr', 'CI', 'PR', 'ref', 'mem', 'SQL', 'cache'],
  4: ['svc', 'dist', 'evt', 'race', 'LB', 'debt', 'lock', 'obs', 'flag', 'bg'],
  5: ['cc', 'kern', '0day', 'wiz', 'perf', 'AI', 'metal', 'scale', 'prod', 'infra'],
  6: ['clean', 'up', 'merge', 'heal', 'senior', 'vim', 'linus', 'docbug', '100%', 'first'],
}

const TIER_BASE_BP = {
  1: 60,
  2: 110,
  3: 170,
  4: 240,
  5: 320,
  6: 410,
}

function termRarityByTierIndex(index) {
  if (index <= 4) return 'common'
  if (index <= 8) return 'rare'
  return 'legendary'
}

function keyFromName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export const TERMS = [1, 2, 3, 4, 5, 6].flatMap((tier) => {
  const names = TIER_NAMES[tier] || []
  const icons = TIER_ICON_SET[tier] || []
  const tierBaseBp = Number(TIER_BASE_BP[tier] || 50)

  return names.map((name, index) => ({
    key: keyFromName(name),
    name,
    tier,
    rarity: termRarityByTierIndex(index),
    icon: icons[index] || `T${tier}`,
    baseBp: tierBaseBp + (index * 9),
  }))
})

export const BASE_BP_MULTIPLIER = BALANCE_CONFIG.baseBpMultiplier

export const TERMS_BY_KEY = TERMS.reduce((acc, term) => {
  acc[term.key] = term
  return acc
}, {})

export const RARITY_COLORS = {
  common: 'var(--rarity-common)',
  rare: 'var(--rarity-rare)',
  legendary: 'var(--rarity-legendary)',
}
