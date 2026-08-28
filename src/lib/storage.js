const SETTINGS_KEY = 'gitlab-time-tracker:settings'
const THEME_KEY = 'gitlab-time-tracker:theme'

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function clearSettings() {
  localStorage.removeItem(SETTINGS_KEY)
}

export function loadThemePreference() {
  try {
    return localStorage.getItem(THEME_KEY)
  } catch {
    return null
  }
}

export function saveThemePreference(theme) {
  if (theme) {
    localStorage.setItem(THEME_KEY, theme)
  } else {
    localStorage.removeItem(THEME_KEY)
  }
}
