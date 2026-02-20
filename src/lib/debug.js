const DEBUG_KEY = 'lucky_debug'

export function hydrateDebugFlagFromUrl() {
  if (typeof window === 'undefined') return false

  const url = new URL(window.location.href)
  const debugParam = url.searchParams.get('debug')

  if (debugParam === '1') {
    window.localStorage.setItem(DEBUG_KEY, '1')
  }

  if (debugParam === '0') {
    window.localStorage.removeItem(DEBUG_KEY)
  }

  return window.localStorage.getItem(DEBUG_KEY) === '1'
}

export function getDebugFlag() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(DEBUG_KEY) === '1'
}
