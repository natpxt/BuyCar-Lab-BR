import { describe, expect, it } from 'vitest'
import {
  THEME_PREFERENCE_KEY,
  loadThemePreference,
  oppositeTheme,
  resolveThemePreference,
  saveThemePreference,
  type ThemeStorage,
} from './themePreference'

function memoryStorage(initial: string | null = null): ThemeStorage & {
  readonly values: Map<string, string>
} {
  const values = new Map<string, string>()
  if (initial !== null) {
    values.set(THEME_PREFERENCE_KEY, initial)
  }
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

describe('preferência de tema', () => {
  it('preserva uma preferência clara salva', () => {
    expect(resolveThemePreference('light', true)).toBe('light')
  })

  it('preserva uma preferência escura salva', () => {
    expect(resolveThemePreference('dark', false)).toBe('dark')
  })

  it('usa a preferência do sistema quando não há valor salvo', () => {
    expect(resolveThemePreference(null, true)).toBe('dark')
    expect(resolveThemePreference(null, false)).toBe('light')
  })

  it('ignora conteúdo inválido salvo', () => {
    expect(resolveThemePreference('unknown', true)).toBe('dark')
  })

  it('carrega e salva sem alterar outros dados locais', () => {
    const storage = memoryStorage()
    storage.values.set('buycar-lab-br:app-state:v1', '{"schemaVersion":1}')

    expect(saveThemePreference(storage, 'dark')).toBe(true)
    expect(loadThemePreference(storage, false)).toBe('dark')
    expect(storage.values.get('buycar-lab-br:app-state:v1')).toBe(
      '{"schemaVersion":1}',
    )
  })

  it('mantém fallback funcional quando o storage falha', () => {
    const storage: ThemeStorage = {
      getItem: () => {
        throw new Error('read failed')
      },
      setItem: () => {
        throw new Error('write failed')
      },
    }

    expect(loadThemePreference(storage, true)).toBe('dark')
    expect(saveThemePreference(storage, 'light')).toBe(false)
  })

  it('alterna entre claro e escuro', () => {
    expect(oppositeTheme('light')).toBe('dark')
    expect(oppositeTheme('dark')).toBe('light')
  })
})
