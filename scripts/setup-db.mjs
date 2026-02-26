import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const schemaPath = path.join(repoRoot, 'supabase', 'schema.sql')
const envPath = path.join(repoRoot, '.env')

function parseDotEnv(contents) {
  const parsed = {}
  const lines = contents.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex < 1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    parsed[key] = value
  }

  return parsed
}

async function loadEnvFromFile() {
  if (!existsSync(envPath)) return

  const raw = await readFile(envPath, 'utf8')
  const parsed = parseDotEnv(raw)

  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function runSyncSchema() {
  execFileSync('node', [path.join(repoRoot, 'scripts', 'sync-schema.mjs')], {
    stdio: 'inherit',
  })
}

function runSchemaApply(connectionString) {
  const normalizedConnectionString = normalizeConnectionString(connectionString)

  const args = [
    normalizedConnectionString,
    '-v',
    'ON_ERROR_STOP=1',
    '-f',
    schemaPath,
  ]

  let result = spawnSync('psql', args, { stdio: 'pipe', encoding: 'utf8' })
  if (result.status === 0) {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    return
  }

  const stderr = String(result.stderr || '')
  const canRetryWithEncodedPercent = normalizedConnectionString.startsWith('postgresql://')
    && /invalid percent-encoded token/i.test(stderr)

  if (canRetryWithEncodedPercent) {
    const sanitized = normalizedConnectionString.replace(/%(?![0-9A-Fa-f]{2})/g, '%25')
    console.warn('setup-db: retrying DB connection with normalized percent-encoding in connection string.')
    result = spawnSync('psql', [sanitized, '-v', 'ON_ERROR_STOP=1', '-f', schemaPath], {
      stdio: 'pipe',
      encoding: 'utf8',
    })
  }

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    throw new Error(`psql exited with code ${result.status ?? 1}`)
  }
}

function normalizeConnectionString(connectionString) {
  const raw = String(connectionString || '').trim()
  if (!raw.startsWith('postgresql://')) return raw

  const hostStart = raw.indexOf('@')
  if (hostStart < 0) return raw

  const protocol = 'postgresql://'
  const userInfo = raw.slice(protocol.length, hostStart)
  const hostAndPath = raw.slice(hostStart + 1)

  const colonIndex = userInfo.indexOf(':')
  if (colonIndex < 0) return raw

  const usernameRaw = userInfo.slice(0, colonIndex)
  const passwordRaw = userInfo.slice(colonIndex + 1)

  const username = decodeSafe(usernameRaw)
  const password = decodeSafe(passwordRaw)

  return `${protocol}${encodeURIComponent(username)}:${encodeURIComponent(password)}@${hostAndPath}`
}

function decodeSafe(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function main() {
  await loadEnvFromFile()

  const connectionString = process.env.SUPABASE_DB_URL
  if (!connectionString) {
    console.error('setup-db failed: SUPABASE_DB_URL is not set.')
    process.exit(1)
  }

  runSyncSchema()
  runSchemaApply(connectionString)

  console.log('setup-db complete: schema synced and applied.')
}

try {
  await main()
} catch (error) {
  console.error('setup-db failed:', error.message)
  process.exit(1)
}
