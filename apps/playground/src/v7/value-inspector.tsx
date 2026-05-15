import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {XIcon} from 'lucide-react'
import {useMemo} from 'react'

/**
 * The "this is PTE" inspector.
 *
 * Renders alongside the deck and shows the live Portable Text value. The
 * point is to demonstrate, mid-presentation, that the slideshow IS a
 * Portable Text document - by showing its value as you type into it.
 *
 * Hidden by default. Toggled via the button in the chrome.
 */
export function ValueInspector(props: {open: boolean; onClose: () => void}) {
  const editor = useEditor()
  const value = useEditorSelector(editor, selectors.getValue)
  const selection = useEditorSelector(editor, selectors.getSelection)

  const renderedValue = useMemo(() => {
    // Stringify only the currently-relevant chunk plus a top-level overview.
    // The full deck value is ~1k lines of JSON, which buries the point.
    if (!Array.isArray(value)) {
      return JSON.stringify(value, null, 2)
    }
    const overview = value.map((slide) => {
      if (slide && typeof slide === 'object' && '_type' in slide) {
        const typedSlide = slide as {_type: string; _key?: string}
        return {
          '_type': typedSlide._type,
          '_key': typedSlide._key,
          // Trim content for legibility - the inspector is making a point,
          // not exposing 4 KB of JSON per slide.
          '…': '<content omitted>',
        }
      }
      return slide
    })
    return JSON.stringify(overview, null, 2)
  }, [value])

  if (!props.open) {
    return null
  }

  return (
    <aside
      contentEditable={false}
      data-deck-no-swipe=""
      className="pointer-events-auto fixed inset-y-0 right-0 z-40 flex w-full max-w-[28rem] flex-col border-stone-300 border-l bg-white/95 shadow-2xl backdrop-blur-md dark:border-stone-700 dark:bg-stone-900/95"
    >
      <header className="flex items-center justify-between border-stone-200 border-b px-4 py-3 dark:border-stone-700">
        <div>
          <h2 className="font-mono font-semibold text-sm text-stone-900 dark:text-stone-50">
            Editor value
          </h2>
          <p className="mt-0.5 text-stone-500 text-xs dark:text-stone-400">
            This is what the deck is.
          </p>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close inspector"
          className="flex size-7 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <XIcon className="size-4" />
        </button>
      </header>

      <div className="flex-1 overflow-auto">
        <pre className="px-4 py-3 font-mono text-stone-700 text-xs leading-relaxed dark:text-stone-300">
          {renderedValue}
        </pre>
      </div>

      <footer className="border-stone-200 border-t px-4 py-3 text-stone-500 text-xs dark:border-stone-700 dark:text-stone-400">
        <div>
          <span className="font-mono">selection:</span>{' '}
          {selection ? (
            <code className="font-mono text-stone-700 dark:text-stone-300">
              {summarizeSelection(selection)}
            </code>
          ) : (
            <em>none</em>
          )}
        </div>
        <p className="mt-2 italic">
          Type into a slide to watch the value update.
        </p>
      </footer>
    </aside>
  )
}

function summarizeSelection(selection: unknown): string {
  if (!selection || typeof selection !== 'object') {
    return 'none'
  }
  const sel = selection as {
    anchor?: {path?: ReadonlyArray<unknown>; offset?: number}
    focus?: {path?: ReadonlyArray<unknown>; offset?: number}
  }
  const a = sel.anchor
  const f = sel.focus
  if (!a || !f) {
    return 'none'
  }
  const aPath = summarizePath(a.path)
  const fPath = summarizePath(f.path)
  if (aPath === fPath && a.offset === f.offset) {
    return `${aPath} @ ${a.offset ?? 0}`
  }
  return `${aPath}@${a.offset ?? 0} → ${fPath}@${f.offset ?? 0}`
}

function summarizePath(path: ReadonlyArray<unknown> | undefined): string {
  if (!path) {
    return '?'
  }
  return path
    .map((segment) => {
      if (typeof segment === 'object' && segment && '_key' in segment) {
        return `{${(segment as {_key: string})._key}}`
      }
      return String(segment)
    })
    .join('.')
}
