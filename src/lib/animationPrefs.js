const ANIMATIONS_PREF_KEY = 'lucky_dev_disable_animations'

export function loadAnimationsDisabled() {
  if (typeof window === 'undefined' || !window.localStorage) return false
  return window.localStorage.getItem(ANIMATIONS_PREF_KEY) === '1'
}

export function applyAnimationsDisabled(disabled) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('animations-off', Boolean(disabled))
}

export function setAnimationsDisabled(disabled) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(ANIMATIONS_PREF_KEY, disabled ? '1' : '0')
  }
  applyAnimationsDisabled(disabled)
}

