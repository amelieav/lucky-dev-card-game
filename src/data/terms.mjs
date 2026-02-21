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
  1: [
    'terminal',
    'message-square',
    'terminal',
    'file-text',
    'minus-square',
    'repeat',
    'alert-circle',
    'code',
    'copy',
    'git-commit',
  ],
  2: [
    'git-merge',
    'package',
    'link-2',
    'alert-circle',
    'file-text',
    'clock',
    'git-pull-request',
    'settings',
    'alert-triangle',
    'hash',
  ],
  3: [
    'clock',
    'link',
    'check-square',
    'box',
    'git-branch',
    'search',
    'tool',
    'cpu',
    'database',
    'zap',
  ],
  4: [
    'layers',
    'share-2',
    'refresh-cw',
    'shuffle',
    'sliders',
    'file-text',
    'lock',
    'bar-chart-2',
    'flag',
    'upload-cloud',
  ],
  5: [
    'cpu',
    'cpu',
    'alert-octagon',
    'star',
    'bar-chart',
    'cpu',
    'hard-drive',
    'maximize',
    'tool',
    'triangle',
  ],
  6: [
    'book-open',
    'repeat',
    'check-square',
    'activity',
    'user-check',
    'type',
    'command',
    'book',
    'shield',
    'award',
  ],
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
