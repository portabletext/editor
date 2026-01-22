import {
  BookOpenIcon,
  GithubIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react'
import {Link, TooltipTrigger} from 'react-aria-components'
import {Button} from './primitives/button'
import {Tooltip} from './primitives/tooltip'
import {useTheme, type ThemeMode} from './theme-context'

function ThemeToggle() {
  const {mode, setMode, resolvedTheme} = useTheme()

  const nextMode: Record<ThemeMode, ThemeMode> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  }

  const label =
    mode === 'system'
      ? 'Theme: System'
      : mode === 'dark'
        ? 'Theme: Dark'
        : 'Theme: Light'

  const icon =
    mode === 'system' ? (
      <MonitorIcon className="size-4" />
    ) : resolvedTheme === 'dark' ? (
      <MoonIcon className="size-4" />
    ) : (
      <SunIcon className="size-4" />
    )

  return (
    <TooltipTrigger>
      <Button
        variant="ghost"
        size="sm"
        onPress={() => setMode(nextMode[mode])}
        aria-label={label}
      >
        {icon}
      </Button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  )
}

export function Header() {
  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
      <a
        href="https://www.portabletext.org"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <img src="/pte.svg" alt="" className="size-5 dark:invert" />
        <span className="text-sm font-medium">Portable Text Editor</span>
      </a>

      <nav className="flex items-center gap-1">
        <TooltipTrigger>
          <Link
            href="https://www.portabletext.org"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Docs"
          >
            <BookOpenIcon className="size-4" />
          </Link>
          <Tooltip>Docs</Tooltip>
        </TooltipTrigger>
        <TooltipTrigger>
          <Link
            href="https://github.com/portabletext/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="GitHub"
          >
            <GithubIcon className="size-4" />
          </Link>
          <Tooltip>GitHub</Tooltip>
        </TooltipTrigger>
        <ThemeToggle />
      </nav>
    </header>
  )
}
