export function getMagicLinkRedirectTo() {
  if (typeof window === 'undefined') return undefined

  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.replace(/\/?$/, '/')
  const callbackPath = `${normalizedBase}#/auth/callback`

  const hostname = String(window.location.hostname || '').toLowerCase()
  const isLocalHost = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
  const runningLocally = Boolean(import.meta.env.DEV || isLocalHost)

  if (runningLocally) {
    const localRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL_LOCAL
    if (localRedirect) return localRedirect

    return new URL(callbackPath, window.location.origin).toString()
  }

  // Explicit override for environments where URL rewriting is strict.
  const configuredRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL
  if (configuredRedirect) return configuredRedirect

  return new URL(callbackPath, window.location.origin).toString()
}

function getSearchParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URL(window.location.href).searchParams
}

function getHashParts() {
  if (typeof window === 'undefined') {
    return { path: '', params: new URLSearchParams() }
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  if (!hash) {
    return { path: '', params: new URLSearchParams() }
  }

  // Supabase implicit flow can return tokens as raw hash query, e.g.
  // #access_token=...&refresh_token=...
  if (!hash.startsWith('/') && hash.includes('=')) {
    return { path: '', params: new URLSearchParams(hash) }
  }

  // Some providers/templates prepend a slash and return:
  // #/access_token=...&refresh_token=...
  if (hash.startsWith('/access_token=')
    || hash.startsWith('/refresh_token=')
    || hash.startsWith('/token_hash=')
    || hash.startsWith('/code=')
    || hash.startsWith('/type=')) {
    return { path: '', params: new URLSearchParams(hash.slice(1)) }
  }

  // Some auth providers append a second hash segment when redirecting into
  // hash-router apps, e.g. #/auth/callback#access_token=...&refresh_token=...
  const secondHashIndex = hash.indexOf('#')
  if (secondHashIndex !== -1) {
    const path = hash.slice(0, secondHashIndex)
    const rawParams = hash.slice(secondHashIndex + 1)
    return { path, params: new URLSearchParams(rawParams) }
  }

  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) {
    return { path: hash, params: new URLSearchParams() }
  }

  const path = hash.slice(0, queryIndex)
  const query = hash.slice(queryIndex + 1)
  return { path, params: new URLSearchParams(query) }
}

function getAuthParam(key) {
  const searchValue = getSearchParams().get(key)
  if (searchValue) return searchValue
  return getHashParts().params.get(key)
}

export function getCodeFromUrl() {
  return getAuthParam('code')
}

export function getTokenHashFromUrl() {
  return getAuthParam('token_hash')
}

export function getOtpTypeFromUrl() {
  return getAuthParam('type')
}

export function getAccessTokenFromUrl() {
  return getAuthParam('access_token')
}

export function getRefreshTokenFromUrl() {
  return getAuthParam('refresh_token')
}

export function hasAuthParamsInUrl() {
  const authKeys = ['code', 'token_hash', 'type', 'access_token', 'refresh_token']
  return authKeys.some((key) => !!getAuthParam(key))
}

export function cleanupAuthParamsFromUrl() {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  const keysToRemove = ['code', 'token_hash', 'type', 'access_token', 'refresh_token']

  keysToRemove.forEach((key) => {
    url.searchParams.delete(key)
  })

  const hashParts = getHashParts()
  keysToRemove.forEach((key) => {
    hashParts.params.delete(key)
  })

  const hashQuery = hashParts.params.toString()
  if (hashParts.path) {
    url.hash = hashQuery ? `#${hashParts.path}?${hashQuery}` : `#${hashParts.path}`
  } else {
    url.hash = hashQuery ? `#${hashQuery}` : ''
  }

  window.history.replaceState({}, document.title, url.toString())
}
