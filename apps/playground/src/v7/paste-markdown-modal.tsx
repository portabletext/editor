import {keyGenerator, type Editor} from '@portabletext/editor'
import {FileTextIcon, XIcon} from 'lucide-react'
import {useEffect, useRef, useState} from 'react'
import {markdownToSlides} from './markdown-to-slides'

/**
 * The "paste markdown" modal.
 *
 * Drops a textarea over the deck. Paste a markdown source, hit Load,
 * the deck redraws as a slideshow. Slide boundaries are horizontal
 * rules (`---` on a line of their own). The deck stays fully editable
 * after loading — markdown sets the initial value, the editor owns
 * everything that happens after.
 */
export function PasteMarkdownModal(props: {
  editor: Editor | null
  open: boolean
  onClose: () => void
  onLoad: (slideCount: number) => void
}) {
  const [source, setSource] = useState(EXAMPLE_SOURCE)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (props.open && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [props.open])

  if (!props.open) {
    return null
  }

  const onLoad = () => {
    if (!props.editor) {
      setError('Editor is not ready yet.')
      return
    }
    try {
      const slides = markdownToSlides(source, keyGenerator)
      if (slides.length === 0) {
        setError('No slides found. Use `---` between slides.')
        return
      }
      props.editor.send({type: 'update value', value: slides})
      setError(null)
      props.onLoad(slides.length)
      props.onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Load markdown"
      contentEditable={false}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-8 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          props.onClose()
        }
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900">
        <header className="flex items-center justify-between border-stone-200 border-b px-6 py-4 dark:border-stone-700">
          <div>
            <h2 className="font-semibold text-lg text-stone-900 dark:text-stone-50">
              Load deck from markdown
            </h2>
            <p className="mt-0.5 text-stone-500 text-sm dark:text-stone-400">
              Use <code className="font-mono">---</code> between slides. Tables,
              code blocks, GFM alerts, and rich text all render through the
              deck's containers.
            </p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto px-6 py-4">
          <textarea
            ref={textareaRef}
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            className="block h-[50vh] w-full resize-none rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-sm text-stone-800 focus:border-stone-400 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
          />
          {error ? (
            <p className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-rose-800 text-sm dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-stone-200 border-t bg-stone-50 px-6 py-3 dark:border-stone-700 dark:bg-stone-900/50">
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-md px-4 py-2 text-stone-600 text-sm hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onLoad}
            className="flex items-center gap-2 rounded-md bg-stone-900 px-4 py-2 font-medium text-sm text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            <FileTextIcon className="size-4" />
            Load deck
          </button>
        </footer>
      </div>
    </div>
  )
}

const EXAMPLE_SOURCE = `# Welcome
### A slide deck built on Portable Text v7.

This deck is just one Portable Text document. Edit any slide live during the talk.

Use \`---\` to add a slide.

---

# Tables work

| Concept | Pre-v7 | v7 |
| --- | --- | --- |
| Path format | Numeric \`[3, 0]\` | Keyed \`[{_key:'b1'}]\` |
| Operations | Slate-flavoured | Patch-compliant |
| Containers | Two levels | Any depth |

---

# Code blocks too

\`\`\`typescript
defineBehavior({
  on: 'keyboard.keydown',
  guard: backspaceInEmptyCell,
  actions: [/* compose primitives */],
})
\`\`\`

---

# Callouts

> [!NOTE]
> GitHub-style alerts render as callouts with tone and icon.

> [!IMPORTANT]
> Each slide stays editable. Type, save, share.
`
