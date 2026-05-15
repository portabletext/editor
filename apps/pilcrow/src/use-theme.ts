import {useEffect, useState} from 'react'

const STORAGE_KEY = 'pilcrow.theme'

export type Theme = 'light' | 'dark'

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  const stored = window.localStorage?.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  // Fall back to system preference.
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

/**
 * Tracks the current theme and writes \`data-theme\` on
 * \`document.documentElement\` so CSS can pick it up. Persists
 * explicit choices to localStorage; system preference wins when the
 * user hasn't chosen.
 */
export function useTheme(): {theme: Theme; toggle: () => void} {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage?.setItem(STORAGE_KEY, next)
      } catch {
        // Storage access may be denied; the in-memory state still
        // applies until reload.
      }
      return next
    })
  }

  return {theme, toggle}
}
