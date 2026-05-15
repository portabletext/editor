import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeIcon,
  FileTextIcon,
} from 'lucide-react'

export function DeckChrome(props: {
  currentIndex: number
  totalSlides: number
  inspectorOpen: boolean
  onPrev: () => void
  onNext: () => void
  onToggleInspector: () => void
  onOpenPaste: () => void
}) {
  const atStart = props.currentIndex === 0
  const atEnd = props.currentIndex === props.totalSlides - 1

  return (
    <div
      contentEditable={false}
      data-deck-no-swipe=""
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:px-8 sm:py-5"
    >
      {/* Brand label - hidden on narrow viewports to save room for the
          nav controls; reappears at sm and above. */}
      <div className="pointer-events-auto hidden items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 font-mono text-sm text-stone-500 backdrop-blur-md sm:flex dark:bg-stone-900/70 dark:text-stone-400">
        Portable Text v7
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={props.onOpenPaste}
          aria-label="Load deck from markdown"
          className="flex size-11 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur-md transition hover:bg-white sm:size-10 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <FileTextIcon className="size-5 sm:size-4" />
        </button>
        <button
          type="button"
          onClick={props.onToggleInspector}
          aria-label={
            props.inspectorOpen
              ? 'Hide value inspector'
              : 'Show value inspector'
          }
          aria-pressed={props.inspectorOpen}
          className="flex size-11 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur-md transition hover:bg-white aria-pressed:bg-stone-900 aria-pressed:text-white sm:size-10 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-800 dark:aria-pressed:bg-stone-100 dark:aria-pressed:text-stone-900"
        >
          <CodeIcon className="size-5 sm:size-4" />
        </button>

        <button
          type="button"
          onClick={props.onPrev}
          disabled={atStart}
          aria-label="Previous slide"
          className="flex size-11 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur-md transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 sm:size-10 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <ChevronLeftIcon className="size-6 sm:size-5" />
        </button>

        <div className="rounded-full bg-white/80 px-3 py-2 font-mono text-sm text-stone-600 shadow-sm backdrop-blur-md sm:px-4 dark:bg-stone-800/80 dark:text-stone-300">
          {props.currentIndex + 1} / {props.totalSlides}
        </div>

        <button
          type="button"
          onClick={props.onNext}
          disabled={atEnd}
          aria-label="Next slide"
          className="flex size-11 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur-md transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 sm:size-10 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <ChevronRightIcon className="size-6 sm:size-5" />
        </button>
      </div>
    </div>
  )
}
