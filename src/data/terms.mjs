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
    'fa-solid fa-terminal',
    'fa-brands fa-stack-overflow',
    'fa-solid fa-terminal',
    'fa-solid fa-note-sticky',
    'fa-solid fa-not-equal',
    'fa-solid fa-infinity',
    'fa-solid fa-bug',
    'fa-solid fa-code',
    'fa-solid fa-copy',
    'fa-brands fa-git-alt',
  ],
  2: [
    'fa-solid fa-code-branch',
    'fa-brands fa-npm',
    'fa-solid fa-link-slash',
    'fa-solid fa-bug',
    'fa-solid fa-file-code',
    'fa-solid fa-hourglass-half',
    'fa-solid fa-code-compare',
    'fa-solid fa-gear',
    'fa-solid fa-fire-extinguisher',
    'fa-solid fa-asterisk',
  ],
  3: [
    'fa-solid fa-clock',
    'fa-solid fa-plug',
    'fa-solid fa-vial',
    'fa-brands fa-docker',
    'fa-solid fa-diagram-project',
    'fa-solid fa-magnifying-glass',
    'fa-solid fa-screwdriver-wrench',
    'fa-solid fa-memory',
    'fa-solid fa-database',
    'fa-solid fa-bolt',
  ],
  4: [
    'fa-solid fa-cubes',
    'fa-solid fa-network-wired',
    'fa-solid fa-arrows-rotate',
    'fa-solid fa-person-running',
    'fa-solid fa-scale-balanced',
    'fa-solid fa-file-invoice-dollar',
    'fa-solid fa-lock',
    'fa-solid fa-chart-line',
    'fa-solid fa-flag',
    'fa-solid fa-cloud-arrow-up',
  ],
  5: [
    'fa-solid fa-gears',
    'fa-solid fa-microchip',
    'fa-solid fa-skull-crossbones',
    'fa-solid fa-hat-wizard',
    'fa-solid fa-gauge-high',
    'fa-solid fa-robot',
    'fa-solid fa-industry',
    'fa-solid fa-expand',
    'fa-solid fa-screwdriver-wrench',
    'fa-solid fa-mountain',
  ],
  6: [
    'fa-solid fa-soap',
    'fa-solid fa-infinity',
    'fa-solid fa-check-double',
    'fa-solid fa-heart-pulse',
    'fa-solid fa-user-graduate',
    'fa-solid fa-keyboard',
    'fa-brands fa-linux',
    'fa-solid fa-book',
    'fa-solid fa-shield-halved',
    'fa-solid fa-trophy',
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
