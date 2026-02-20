export const TERMS = [
  { key: 'if_statement', name: 'If Statement', tier: 1, rarity: 'common', baseBp: 55 },
  { key: 'for_loop', name: 'For Loop', tier: 1, rarity: 'common', baseBp: 58 },
  { key: 'variable_scope', name: 'Variable Scope', tier: 1, rarity: 'common', baseBp: 52 },
  { key: 'function_args', name: 'Function Args', tier: 1, rarity: 'rare', baseBp: 66 },
  { key: 'array_methods', name: 'Array Methods', tier: 1, rarity: 'rare', baseBp: 72 },

  { key: 'objects', name: 'Objects', tier: 2, rarity: 'common', baseBp: 70 },
  { key: 'recursion', name: 'Recursion', tier: 2, rarity: 'rare', baseBp: 86 },
  { key: 'async_await', name: 'Async/Await', tier: 2, rarity: 'rare', baseBp: 96 },
  { key: 'api_contracts', name: 'API Contracts', tier: 2, rarity: 'epic', baseBp: 112 },
  { key: 'state_management', name: 'State Management', tier: 2, rarity: 'epic', baseBp: 120 },

  { key: 'git_workflow', name: 'Git Workflow', tier: 3, rarity: 'common', baseBp: 92 },
  { key: 'unit_testing', name: 'Unit Testing', tier: 3, rarity: 'rare', baseBp: 110 },
  { key: 'ci_cd', name: 'CI/CD', tier: 3, rarity: 'epic', baseBp: 142 },
  { key: 'docker', name: 'Docker', tier: 3, rarity: 'epic', baseBp: 150 },
  { key: 'observability', name: 'Observability', tier: 3, rarity: 'legendary', baseBp: 178 },

  { key: 'data_prep', name: 'Data Preprocessing', tier: 4, rarity: 'rare', baseBp: 132 },
  { key: 'feature_engineering', name: 'Feature Engineering', tier: 4, rarity: 'epic', baseBp: 168 },
  { key: 'model_training', name: 'Model Training', tier: 4, rarity: 'epic', baseBp: 182 },
  { key: 'model_eval', name: 'Model Evaluation', tier: 4, rarity: 'legendary', baseBp: 210 },
  { key: 'overfitting_control', name: 'Overfitting Control', tier: 4, rarity: 'legendary', baseBp: 220 },

  { key: 'prompt_engineering', name: 'Prompt Engineering', tier: 5, rarity: 'rare', baseBp: 160 },
  { key: 'rag', name: 'RAG', tier: 5, rarity: 'epic', baseBp: 214 },
  { key: 'function_calling', name: 'Function Calling', tier: 5, rarity: 'epic', baseBp: 228 },
  { key: 'agent_memory', name: 'Agent Memory', tier: 5, rarity: 'legendary', baseBp: 264 },
  { key: 'multi_agent', name: 'Multi-Agent Systems', tier: 5, rarity: 'legendary', baseBp: 282 },

  { key: 'neural_networks', name: 'Neural Networks', tier: 6, rarity: 'epic', baseBp: 240 },
  { key: 'transformers', name: 'Transformers', tier: 6, rarity: 'legendary', baseBp: 310 },
  { key: 'reinforcement_learning', name: 'Reinforcement Learning', tier: 6, rarity: 'legendary', baseBp: 330 },
  { key: 'diffusion_models', name: 'Diffusion Models', tier: 6, rarity: 'legendary', baseBp: 355 },
  { key: 'distributed_training', name: 'Distributed Training', tier: 6, rarity: 'legendary', baseBp: 380 },
]

export const TERMS_BY_KEY = TERMS.reduce((acc, term) => {
  acc[term.key] = term
  return acc
}, {})

export const RARITY_COLORS = {
  common: 'var(--rarity-common)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
}
