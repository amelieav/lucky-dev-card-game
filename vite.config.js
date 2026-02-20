const { defineConfig } = require('vite')
const vue = require('@vitejs/plugin-vue')

const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split('/')[1]
  : ''

const base = process.env.VITE_BASE_PATH
  || (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/')

module.exports = defineConfig({
  plugins: [vue()],
  base,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
