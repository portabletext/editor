import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import React from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Tooltip} from '../primitives/tooltip'

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
          <RenderKeyboardShortcut shortcut={props.shortcutKeys} />
        ) : null}
      </Tooltip>
    </TooltipTrigger>
  )
}

function RenderKeyboardShortcut(props: {shortcut: ReadonlyArray<string>}) {
  return (
    <span className="inline-flex gap-1 font-mono text-sm">
      {props.shortcut.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 ? (
            <span className="inline-block opacity-50">+</span>
          ) : null}
          <kbd className="inline-block">{key}</kbd>
        </React.Fragment>
      ))}
    </span>
  )
}
