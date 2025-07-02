import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import type React from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Tooltip} from '../primitives/tooltip'
import {KeyboardShortcutPreview} from './keyboard-shortcut-preview'

export function ButtonTooltip(props: {
  label: string
  shortcutKeys?: KeyboardShortcut['keys']
  children: React.ReactNode
}) {
  return (
    <TooltipTrigger>
      {props.children}
      <Tooltip className="flex items-center gap-3">
        {props.label}
        {props.shortcutKeys ? (
          <KeyboardShortcutPreview shortcut={props.shortcutKeys} />
        ) : null}
      </Tooltip>
    </TooltipTrigger>
  )
}
