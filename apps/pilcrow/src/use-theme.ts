import {useEffect, useState} from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'pilcrow.theme'

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null
  }
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

function readSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.setAttribute('data-theme', theme)
}

/**
 * Theme preference resolution:
 *
 *   1. user choice stored in localStorage (manual override)
 *   2. `prefers-color-scheme` media query (system default)
 *
 * The chosen theme is reflected on `:root[data-theme]` so `theme.css` can
 * branch with `:root[data-theme='dark'] { ... }`. The setter persists the
 * user's choice; clearing it (passing `null`) returns to system follow.
 */
export function useTheme(): {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
} {
  const [theme, setThemeState] = useState<Theme>(
    () => readStoredTheme() ?? readSystemTheme(),
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    // If the user has stored a preference, do not track the system.
    if (readStoredTheme() !== null) {
      return
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setTheme = (next: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return {theme, setTheme, toggleTheme}
}
