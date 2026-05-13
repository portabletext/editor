import {useTheme} from './use-theme'

/**
 * Standalone theme toggle used in the app header. The button is
 * round and reads as a 'persona' switch rather than another
 * toolbar tool - keeps it visually separate from text-formatting
 * toggles.
 */
export function ThemeToggle() {
  const {theme, toggle} = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      className="pc-theme-toggle"
      onClick={toggle}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
    >
      <span aria-hidden>{isDark ? '☾' : '☀'}</span>
    </button>
  )
}
