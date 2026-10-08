export type ThemeMode = 'light' | 'dark'

export const THEME_PREFERENCE_KEY = 'buycar-lab-br:theme'

export interface ThemeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function resolveThemePreference(
  storedValue: string | null,
  prefersDark: boolean,
): ThemeMode {
  if (storedValue === 'light' || storedValue === 'dark') {
    return storedValue
  }
  return prefersDark ? 'dark' : 'light'
}

export function loadThemePreference(
  storage: ThemeStorage,
  prefersDark: boolean,
): ThemeMode {
  try {
    return resolveThemePreference(
      storage.getItem(THEME_PREFERENCE_KEY),
      prefersDark,
    )
  } catch {
    return prefersDark ? 'dark' : 'light'
  }
}

export function saveThemePreference(
  storage: ThemeStorage,
  theme: ThemeMode,
): boolean {
  try {
    storage.setItem(THEME_PREFERENCE_KEY, theme)
    return true
  } catch {
    return false
  }
}

export function oppositeTheme(theme: ThemeMode): ThemeMode {
  return theme === 'dark' ? 'light' : 'dark'
}
