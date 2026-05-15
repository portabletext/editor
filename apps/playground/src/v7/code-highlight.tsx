import type {ReactNode} from 'react'

/**
 * A code block rendered inside the deck.
 *
 * The lines remain editable Portable Text - this is not an overlay or a
 * separate editor. Shiki syntax highlighting is wired up at the editable
 * level via rangeDecorations; this component owns the chrome - language
 * label, padding, the dark background, the rounded border.
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
      data-deck-no-swipe=""
      className="deck-code-block group relative my-4 overflow-x-auto rounded-lg border border-stone-300 bg-stone-900 px-3 py-3 font-mono text-stone-100 text-xs leading-6 shadow-sm transition-shadow data-[selected]:border-stone-500 data-[selected]:shadow-lg sm:my-5 sm:px-5 sm:py-4 sm:text-sm sm:leading-7 dark:border-stone-700"
    >
      <span
        contentEditable={false}
        className="absolute top-1.5 right-2 hidden select-none font-mono text-[10px] text-stone-500 uppercase tracking-wider sm:top-2 sm:right-3 sm:inline sm:text-xs"
      >
        {props.language}
      </span>
      {props.children}
    </pre>
  )
}
