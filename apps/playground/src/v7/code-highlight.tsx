import type {ReactNode} from 'react'

/**
 * A code block rendered inside the deck.
 *
 * The lines remain editable Portable Text - this isn't an overlay or a
 * separate editor. The styling is monospace and dark; the language label
 * sits in the chrome above the content.
 *
 * Syntax highlighting (Shiki) is a follow-up. The codebase pulls Shiki in
 * via the playground for export rendering, but driving Shiki against the
 * editable's live text without breaking caret position needs a more careful
 * pass than this slide deck warrants today.
 */
export function CodeHighlight(props: {
  attributes: Record<string, unknown>
  selected: boolean
  language: string
  children: ReactNode
}) {
  return (
    <pre
      {...(props.attributes as Record<string, string>)}
      data-selected={props.selected ? '' : undefined}
      data-language={props.language}
      className="deck-code-block group relative my-5 overflow-x-auto rounded-lg border border-stone-300 bg-stone-900 px-5 py-4 font-mono text-stone-100 text-sm leading-7 shadow-sm transition-shadow data-[selected]:border-stone-500 data-[selected]:shadow-lg dark:border-stone-700"
    >
      <span
        contentEditable={false}
        className="absolute top-2 right-3 select-none font-mono text-stone-500 text-xs uppercase tracking-wider"
      >
        {props.language}
      </span>
      {props.children}
    </pre>
  )
}
