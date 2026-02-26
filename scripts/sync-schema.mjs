import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TERMS } from '../src/data/terms.mjs'
import { NICK_PARTS_A, NICK_PARTS_B, NICK_PARTS_C, NICK_WORD_CATEGORIES } from '../src/data/nicknameParts.mjs'

const TERM_MARKER_START = '-- GENERATED: term_catalog:start'
const TERM_MARKER_END = '-- GENERATED: term_catalog:end'
const NICK_MARKER_START = '-- GENERATED: nickname_words:start'
const NICK_MARKER_END = '-- GENERATED: nickname_words:end'

const TERM_LEGACY_PATTERN = /insert into public\.term_catalog\s*\([^)]*\)[\s\S]*?base_bp = excluded\.base_bp;/m
const NICK_LEGACY_PATTERN = /create or replace function public\.allowed_nick_words\(\)[\s\S]*?create or replace function public\.allowed_nick_part_c\(\)[\s\S]*?\$\$;/m

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const schemaPath = path.join(repoRoot, 'supabase', 'schema.sql')

function uniqueInOrder(values) {
  const seen = new Set()
  const result = []

  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }

  return result
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''")
}

function formatTextArray(values, itemsPerLine = 14) {
  const quoted = values.map((value) => `'${escapeSql(value)}'`)
  const lines = []

  for (let i = 0; i < quoted.length; i += itemsPerLine) {
    lines.push(`    ${quoted.slice(i, i + itemsPerLine).join(', ')}`)
  }

  return lines.join(',\n')
}

function buildAllowedNickFunction(functionName, words) {
  return [
    `create or replace function public.${functionName}()`,
    'returns text[]',
    'language sql',
    'stable',
    'as $$',
    '  select array[',
    formatTextArray(words),
    '  ];',
    '$$;',
  ].join('\n')
}

function buildTermCatalogBlock() {
  const canonicalRows = TERMS.map((term) => {
    return `    ('${escapeSql(term.slotId)}', '${escapeSql(term.key)}')`
  }).join(',\n')

  const valueRows = TERMS.map((term) => {
    return `  ('${escapeSql(term.slotId)}', '${escapeSql(term.key)}', '${escapeSql(term.name)}', ${Number(term.tier)}, '${escapeSql(term.rarity)}', ${Number(term.baseBp)})`
  }).join(',\n')

  return [
    TERM_MARKER_START,
    'with canonical(card_slot_id, term_key) as (',
    '  values',
    canonicalRows,
    ')',
    'update public.term_catalog tc',
    'set card_slot_id = canonical.card_slot_id',
    'from canonical',
    'where tc.term_key = canonical.term_key',
    '  and tc.card_slot_id <> canonical.card_slot_id;',
    '',
    'insert into public.term_catalog (card_slot_id, term_key, display_name, tier, rarity, base_bp)',
    'values',
    valueRows,
    'on conflict (card_slot_id) do update',
    'set',
    '  term_key = excluded.term_key,',
    '  display_name = excluded.display_name,',
    '  tier = excluded.tier,',
    '  rarity = excluded.rarity,',
    '  base_bp = excluded.base_bp;',
    TERM_MARKER_END,
  ].join('\n')
}

function buildNicknameBlock() {
  const allWords = uniqueInOrder(Object.values(NICK_WORD_CATEGORIES).flat())

  return [
    NICK_MARKER_START,
    buildAllowedNickFunction('allowed_nick_words', allWords),
    '',
    buildAllowedNickFunction('allowed_nick_part_a', NICK_PARTS_A),
    '',
    buildAllowedNickFunction('allowed_nick_part_b', NICK_PARTS_B),
    '',
    buildAllowedNickFunction('allowed_nick_part_c', NICK_PARTS_C),
    NICK_MARKER_END,
  ].join('\n')
}

function replaceGeneratedSection(content, startMarker, endMarker, replacement, fallbackPattern) {
  const markerPattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`, 'm')

  if (markerPattern.test(content)) {
    return content.replace(markerPattern, () => replacement)
  }

  if (fallbackPattern.test(content)) {
    return content.replace(fallbackPattern, () => replacement)
  }

  throw new Error(`Unable to locate section for ${startMarker}`)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
}

export async function syncSchema() {
  const original = await readFile(schemaPath, 'utf8')

  let next = original
  next = replaceGeneratedSection(next, TERM_MARKER_START, TERM_MARKER_END, buildTermCatalogBlock(), TERM_LEGACY_PATTERN)
  next = replaceGeneratedSection(next, NICK_MARKER_START, NICK_MARKER_END, buildNicknameBlock(), NICK_LEGACY_PATTERN)

  if (next === original) {
    console.log('schema sync: no changes')
    return false
  }

  await writeFile(schemaPath, next)
  console.log('schema sync: updated supabase/schema.sql')
  return true
}

const runningAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (runningAsScript) {
  try {
    await syncSchema()
  } catch (error) {
    console.error('schema sync failed:', error.message)
    process.exit(1)
  }
}
