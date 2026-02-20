export const TERMS = [
  { key: 'if_statement', name: 'If Statement', tier: 1, rarity: 'common', baseBp: 50 },
  { key: 'else_elif', name: 'Else / Elif', tier: 1, rarity: 'common', baseBp: 55 },
  { key: 'for_loop', name: 'For Loop', tier: 1, rarity: 'common', baseBp: 60 },
  { key: 'while_loop', name: 'While Loop', tier: 1, rarity: 'common', baseBp: 65 },
  { key: 'variables', name: 'Variables', tier: 1, rarity: 'common', baseBp: 70 },
  { key: 'constants', name: 'Constants', tier: 1, rarity: 'rare', baseBp: 75 },
  { key: 'data_types', name: 'Data Types', tier: 1, rarity: 'rare', baseBp: 80 },
  { key: 'operators', name: 'Operators', tier: 1, rarity: 'rare', baseBp: 85 },
  { key: 'functions', name: 'Functions', tier: 1, rarity: 'epic', baseBp: 90 },
  { key: 'return_values', name: 'Return Values', tier: 1, rarity: 'epic', baseBp: 95 },

  { key: 'arrays', name: 'Arrays', tier: 2, rarity: 'common', baseBp: 90 },
  { key: 'objects', name: 'Objects', tier: 2, rarity: 'common', baseBp: 97 },
  { key: 'maps', name: 'Maps', tier: 2, rarity: 'common', baseBp: 104 },
  { key: 'sets', name: 'Sets', tier: 2, rarity: 'common', baseBp: 111 },
  { key: 'string_methods', name: 'String Methods', tier: 2, rarity: 'rare', baseBp: 118 },
  { key: 'array_methods', name: 'Array Methods', tier: 2, rarity: 'rare', baseBp: 125 },
  { key: 'scope', name: 'Scope', tier: 2, rarity: 'rare', baseBp: 132 },
  { key: 'closures', name: 'Closures', tier: 2, rarity: 'rare', baseBp: 139 },
  { key: 'recursion', name: 'Recursion', tier: 2, rarity: 'epic', baseBp: 146 },
  { key: 'modules', name: 'Modules', tier: 2, rarity: 'epic', baseBp: 153 },

  { key: 'callbacks', name: 'Callbacks', tier: 3, rarity: 'common', baseBp: 140 },
  { key: 'promises', name: 'Promises', tier: 3, rarity: 'common', baseBp: 149 },
  { key: 'async_await', name: 'Async/Await', tier: 3, rarity: 'common', baseBp: 158 },
  { key: 'event_loop', name: 'Event Loop', tier: 3, rarity: 'rare', baseBp: 167 },
  { key: 'http_basics', name: 'HTTP Basics', tier: 3, rarity: 'rare', baseBp: 176 },
  { key: 'rest_apis', name: 'REST APIs', tier: 3, rarity: 'rare', baseBp: 185 },
  { key: 'api_contracts', name: 'API Contracts', tier: 3, rarity: 'rare', baseBp: 194 },
  { key: 'state_management', name: 'State Management', tier: 3, rarity: 'epic', baseBp: 203 },
  { key: 'caching_basics', name: 'Caching Basics', tier: 3, rarity: 'epic', baseBp: 212 },
  { key: 'error_handling', name: 'Error Handling', tier: 3, rarity: 'legendary', baseBp: 221 },

  { key: 'git_workflow', name: 'Git Workflow', tier: 4, rarity: 'rare', baseBp: 210 },
  { key: 'branching_strategy', name: 'Branching Strategy', tier: 4, rarity: 'rare', baseBp: 221 },
  { key: 'pull_requests', name: 'Pull Requests', tier: 4, rarity: 'rare', baseBp: 232 },
  { key: 'unit_testing', name: 'Unit Testing', tier: 4, rarity: 'rare', baseBp: 243 },
  { key: 'integration_testing', name: 'Integration Testing', tier: 4, rarity: 'epic', baseBp: 254 },
  { key: 'ci_pipelines', name: 'CI Pipelines', tier: 4, rarity: 'epic', baseBp: 265 },
  { key: 'cd_pipelines', name: 'CD Pipelines', tier: 4, rarity: 'epic', baseBp: 276 },
  { key: 'docker_basics', name: 'Docker Basics', tier: 4, rarity: 'epic', baseBp: 287 },
  { key: 'observability', name: 'Observability', tier: 4, rarity: 'legendary', baseBp: 298 },
  { key: 'performance_profiling', name: 'Performance Profiling', tier: 4, rarity: 'legendary', baseBp: 309 },

  { key: 'gradient_descent', name: 'Gradient Descent', tier: 5, rarity: 'rare', baseBp: 300 },
  { key: 'backpropagation', name: 'Backpropagation', tier: 5, rarity: 'rare', baseBp: 314 },
  { key: 'activation_functions', name: 'Activation Functions', tier: 5, rarity: 'epic', baseBp: 328 },
  { key: 'loss_functions', name: 'Loss Functions', tier: 5, rarity: 'epic', baseBp: 342 },
  { key: 'optimizers', name: 'Optimizers (SGD/Adam)', tier: 5, rarity: 'epic', baseBp: 356 },
  { key: 'regularization', name: 'Regularization', tier: 5, rarity: 'epic', baseBp: 370 },
  { key: 'cnns', name: 'CNNs', tier: 5, rarity: 'epic', baseBp: 384 },
  { key: 'rnns_lstms', name: 'RNNs/LSTMs', tier: 5, rarity: 'legendary', baseBp: 398 },
  { key: 'attention', name: 'Attention', tier: 5, rarity: 'legendary', baseBp: 412 },
  { key: 'transformers', name: 'Transformers', tier: 5, rarity: 'legendary', baseBp: 426 },

  { key: 'tool_calling', name: 'Tool Calling', tier: 6, rarity: 'epic', baseBp: 420 },
  { key: 'function_routing', name: 'Function Routing', tier: 6, rarity: 'epic', baseBp: 438 },
  { key: 'planner_executor_agents', name: 'Planner-Executor Agents', tier: 6, rarity: 'epic', baseBp: 456 },
  { key: 'multi_agent_coordination', name: 'Multi-Agent Coordination', tier: 6, rarity: 'epic', baseBp: 474 },
  { key: 'reflection_loops', name: 'Reflection Loops', tier: 6, rarity: 'legendary', baseBp: 492 },
  { key: 'agent_memory_architectures', name: 'Agent Memory Architectures', tier: 6, rarity: 'legendary', baseBp: 510 },
  { key: 'rag_pipelines', name: 'RAG Pipelines', tier: 6, rarity: 'legendary', baseBp: 528 },
  { key: 'agent_guardrails', name: 'Agent Guardrails', tier: 6, rarity: 'legendary', baseBp: 546 },
  { key: 'agent_evaluation_harnesses', name: 'Agent Evaluation Harnesses', tier: 6, rarity: 'legendary', baseBp: 564 },
  { key: 'autonomous_task_decomposition', name: 'Autonomous Task Decomposition', tier: 6, rarity: 'legendary', baseBp: 582 },
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
