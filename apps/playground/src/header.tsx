import {useSelector} from '@xstate/react'
import {
  BookOpenIcon,
  GithubIcon,
  MonitorIcon,
  MoonIcon,
  NetworkIcon,
  PanelRightIcon,
  PlusIcon,
  SunIcon,
  WrenchIcon,
} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import type {PlaygroundActorRef} from './playground-machine'
import {Button, LinkButton} from './primitives/button'
import {Separator} from './primitives/separator'
import {Switch} from './primitives/switch'
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

export function Header(props: {playgroundRef: PlaygroundActorRef}) {
  const showInspector = useSelector(props.playgroundRef, (s) =>
    s.matches({'inspector visibility': 'shown'}),
  )
  const playgroundFeatureFlags = useSelector(
    props.playgroundRef,
    (s) => s.context.featureFlags,
  )

  return (
    <header className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-gray-200 dark:border-gray-700 gap-2">
      <div className="flex items-center gap-2">
        <a
          href="https://www.portabletext.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150 shrink-0"
        >
          <img src="/pte.svg" alt="" className="size-5 shrink-0" />
          <span className="text-sm font-medium hidden sm:inline">
            Portable Text Editor
          </span>
        </a>
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <TooltipTrigger>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              props.playgroundRef.send({type: 'add editor'})
            }}
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">Add editor</span>
          </Button>
          <Tooltip className="sm:hidden">Add editor</Tooltip>
        </TooltipTrigger>
      </div>

      <nav className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Switch
            isSelected={playgroundFeatureFlags.toolbar}
            onChange={() => {
              props.playgroundRef.send({
                type: 'toggle feature flag',
                flag: 'toolbar',
              })
            }}
          >
            <WrenchIcon className="size-4" />
            <span className="hidden sm:inline">Toolbar</span>
          </Switch>
          <Switch
            isSelected={showInspector}
            onChange={() => {
              props.playgroundRef.send({type: 'toggle inspector'})
            }}
          >
            <PanelRightIcon className="size-4" />
            <span className="hidden sm:inline">Inspector</span>
          </Switch>
          <Switch
            isSelected={playgroundFeatureFlags.yjsMode}
            onChange={() => {
              props.playgroundRef.send({
                type: 'toggle feature flag',
                flag: 'yjsMode',
              })
            }}
          >
            <NetworkIcon className="size-4" />
            <span className="hidden sm:inline">Yjs Sync</span>
          </Switch>
        </div>
        <Separator orientation="vertical" className="h-5 hidden sm:block" />
        <div className="flex items-center gap-1">
          <TooltipTrigger>
            <LinkButton
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              aria-label="Docs"
              href="https://www.portabletext.org"
              target="_blank"
            >
              <BookOpenIcon className="size-4" />
            </LinkButton>
            <Tooltip>Docs</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <LinkButton
              variant="ghost"
              size="sm"
              aria-label="GitHub"
              href="https://github.com/portabletext/editor"
              target="_blank"
            >
              <GithubIcon className="size-4" />
            </LinkButton>
            <Tooltip>GitHub</Tooltip>
          </TooltipTrigger>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
