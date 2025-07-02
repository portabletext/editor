import React from 'react'
import {tv} from 'tailwind-variants'

const styles = tv({
  base: 'inline-flex gap-1 font-mono text-sm',
  variants: {
    size: {
      small: 'text-xs',
    },
  },
})

export function KeyboardShortcutPreview(props: {
  shortcut: ReadonlyArray<string>
  size?: 'small'
}) {
  return (
    <span className={styles({size: props.size})}>
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
