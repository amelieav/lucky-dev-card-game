import leoProfanity from 'leo-profanity'

export const DISPLAY_NAME_MIN_LENGTH = 3
export const DISPLAY_NAME_MAX_LENGTH = 16
export const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9_]+$/

export function normalizeDisplayNameForCheck(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function validateDisplayName(inputValue) {
  const value = String(inputValue || '').trim()

  if (value.length < DISPLAY_NAME_MIN_LENGTH || value.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      code: 'length',
      message: `Display name must be ${DISPLAY_NAME_MIN_LENGTH}-${DISPLAY_NAME_MAX_LENGTH} characters.`,
    }
  }

  if (!DISPLAY_NAME_PATTERN.test(value)) {
    return {
      ok: false,
      code: 'charset',
      message: 'Display name can only use letters, numbers, and underscores.',
    }
  }

  const normalizedForCheck = normalizeDisplayNameForCheck(value)
  if (!normalizedForCheck) {
    return {
      ok: false,
      code: 'empty',
      message: 'Display name is invalid.',
    }
  }

  if (leoProfanity.check(normalizedForCheck)) {
    return {
      ok: false,
      code: 'profanity',
      message: 'Display name contains blocked language.',
    }
  }

  return {
    ok: true,
    code: null,
    message: null,
    value,
    normalizedForCheck,
  }
}
