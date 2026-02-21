const { defineConfig } = require('vite')
const vue = require('@vitejs/plugin-vue')
const path = require('path')
const { execFileSync } = require('child_process')

const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split('/')[1]
  : ''

const base = process.env.VITE_BASE_PATH
  || (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/')

const schemaSyncTargets = new Set([
  path.resolve(__dirname, 'src/data/terms.mjs'),
  path.resolve(__dirname, 'src/data/nicknameParts.mjs'),
  path.resolve(__dirname, 'src/lib/balanceConfig.mjs'),
])

function runSchemaSync() {
  execFileSync('node', [path.resolve(__dirname, 'scripts/sync-schema.mjs')], {
    cwd: __dirname,
    stdio: 'inherit',
  })
}

function schemaSyncPlugin() {
  return {
    name: 'schema-sync-on-local-data-change',
    apply: 'serve',
    configureServer(server) {
      runSchemaSync()

      server.watcher.on('change', (file) => {
        if (!schemaSyncTargets.has(path.resolve(file))) return
        runSchemaSync()
      })
    },
  }
}

module.exports = defineConfig({
  plugins: [vue(), schemaSyncPlugin()],
  base,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
