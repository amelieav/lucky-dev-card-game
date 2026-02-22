import { TERMS, TERMS_BY_KEY } from './terms.mjs'

const BOOSTER_TIER_PRESENTATION = {
  1: [
    { name: 'Lint Warning', icon: 'aperture' },
    { name: 'Typo in Variable', icon: 'archive' },
    { name: 'Whitespace Fix', icon: 'at-sign' },
    { name: 'README Update', icon: 'bell' },
    { name: 'Branch Rename', icon: 'bluetooth' },
    { name: 'Package Lock Drift', icon: 'bold' },
    { name: 'Stale Cache', icon: 'bookmark' },
    { name: 'Broken Link', icon: 'briefcase' },
    { name: 'Quick Patch', icon: 'camera' },
    { name: 'Config Toggle', icon: 'cast' },
  ],
  2: [
    { name: 'Expired Token', icon: 'check-circle' },
    { name: 'CORS Blocked', icon: 'chevrons-down' },
    { name: 'Schema Mismatch', icon: 'chevrons-left' },
    { name: 'Flaky Test', icon: 'chevrons-right' },
    { name: 'Circular Dependency', icon: 'chevrons-up' },
    { name: 'API Contract Drift', icon: 'chrome' },
    { name: 'Queue Backlog', icon: 'circle' },
    { name: 'Retry Storm', icon: 'clipboard' },
    { name: 'Permission Denied', icon: 'cloud' },
    { name: 'Rollback Plan', icon: 'cloud-drizzle' },
  ],
  3: [
    { name: 'Feature Rollout', icon: 'cloud-lightning' },
    { name: 'Canary Analysis', icon: 'cloud-off' },
    { name: 'Read Replica Lag', icon: 'cloud-rain' },
    { name: 'Idempotency Key', icon: 'cloud-snow' },
    { name: 'Saga Orchestrator', icon: 'coffee' },
    { name: 'Event Sourcing', icon: 'columns' },
    { name: 'CQRS Split', icon: 'compass' },
    { name: 'Service Mesh', icon: 'corner-down-left' },
    { name: 'Cost Optimization', icon: 'corner-down-right' },
    { name: 'Latency Budget', icon: 'corner-left-down' },
  ],
  4: [
    { name: 'Regional Failover', icon: 'corner-left-up' },
    { name: 'Chaos Experiment', icon: 'corner-right-down' },
    { name: 'Backpressure Valve', icon: 'corner-right-up' },
    { name: 'Adaptive Throttling', icon: 'corner-up-left' },
    { name: 'Shard Rebalancer', icon: 'corner-up-right' },
    { name: 'Exactly Once Myth', icon: 'crosshair' },
    { name: 'Consensus Quorum', icon: 'disc' },
    { name: 'Snapshot Recovery', icon: 'divide' },
    { name: 'Zero Downtime Migration', icon: 'divide-circle' },
    { name: 'Blast Radius Control', icon: 'divide-square' },
  ],
  5: [
    { name: 'Kernel Bypass IO', icon: 'dollar-sign' },
    { name: 'Lock Free Queue', icon: 'download' },
    { name: 'Vectorized Query', icon: 'download-cloud' },
    { name: 'Compiler Inlining', icon: 'droplet' },
    { name: 'Deterministic Build', icon: 'edit' },
    { name: 'Memory Model', icon: 'edit-2' },
    { name: 'Formal Verification', icon: 'edit-3' },
    { name: 'Protocol Upgrade', icon: 'external-link' },
    { name: 'Post Quantum Readiness', icon: 'eye' },
    { name: 'Global Consistency', icon: 'eye-off' },
  ],
  6: [
    { name: 'Self Tuning Runtime', icon: 'fast-forward' },
    { name: 'Autonomous Incident Commander', icon: 'feather' },
    { name: 'Planet Scale Ledger', icon: 'film' },
    { name: 'Provable Resilience', icon: 'filter' },
    { name: 'Universal Schema Graph', icon: 'folder' },
    { name: 'Causal Time Machine', icon: 'folder-minus' },
    { name: 'Runtime Synthesis', icon: 'folder-plus' },
    { name: 'Adaptive Consensus', icon: 'gift' },
    { name: 'Generalized Optimizer', icon: 'gitlab' },
    { name: 'Singularity Release', icon: 'globe' },
  ],
}

const BOOSTER_PRESENTATION_BY_KEY = (() => {
  const rows = {}

  for (let tier = 1; tier <= 6; tier += 1) {
    const tierTerms = TERMS.filter((term) => Number(term.tier || 1) === tier)
    const tierPresentation = BOOSTER_TIER_PRESENTATION[tier] || []
    for (let index = 0; index < tierTerms.length; index += 1) {
      const term = tierTerms[index]
      const presentation = tierPresentation[index]
      if (!term || !presentation) continue
      rows[term.key] = {
        name: presentation.name,
        icon: presentation.icon,
      }
    }
  }

  return rows
})()

function normalizeLayer(layer) {
  return Math.max(1, Math.min(2, Number(layer || 1)))
}

export function getTermPresentation(termKey, layer = 1) {
  const key = String(termKey || '').trim()
  const base = TERMS_BY_KEY[key]
  if (!base) {
    return { name: 'Unknown Card', icon: 'help-circle' }
  }

  if (normalizeLayer(layer) === 1) {
    return {
      name: base.name,
      icon: base.icon || 'help-circle',
    }
  }

  const booster = BOOSTER_PRESENTATION_BY_KEY[key]
  if (!booster) {
    return {
      name: base.name,
      icon: base.icon || 'help-circle',
    }
  }

  return {
    name: booster.name,
    icon: booster.icon || base.icon || 'help-circle',
  }
}
