import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'
import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'

function KeyboardShortcutPreview(props: {shortcut: KeyboardShortcut['keys']}) {
  return (
    <kbd className="flex items-center gap-0.5 text-xs opacity-60">
      {props.shortcut.map((key, index) => (
        <span key={index}>{key}</span>
      ))}
    </kbd>
  )
}

export function ButtonTooltip(props: {
  label: string
  shortcutKeys?: KeyboardShortcut['keys']
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{props.children}</TooltipTrigger>
      <TooltipContent className="flex items-center gap-3">
        {props.label}
        {props.shortcutKeys ? (
          <KeyboardShortcutPreview shortcut={props.shortcutKeys} />
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
