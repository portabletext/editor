import {
  EditorProvider,
  keyGenerator,
  PortableTextEditable,
  type Editor,
  type RenderAnnotationFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderPlaceholderFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'
import {
  EditorRefPlugin,
  EventListenerPlugin,
} from '@portabletext/editor/plugins'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {DeckChrome} from './deck-chrome'
import {DeckContainerPlugins} from './deck-containers'
import {DeckNavPlugin} from './plugin.deck-nav'
import {deckSchemaDefinition} from './schema'
import {useShikiDecorations} from './shiki'
import {SlidePlugin} from './slide-container'
import {SlideIndexContext} from './slide-nav-context'
import {deckValue} from './slides'
import {ValueInspector} from './value-inspector'

/**
 * The v7 deck.
 *
 * One Portable Text document, N slide containers at the root, one slide
 * visible at a time. Navigation (arrow keys, click) drives a single
 * `currentSlideIndex` piece of state; the slide container's `render`
 * callback reads it from context and shows or hides itself.
 *
 * The editor is fully editable - Christian can type into a slide during
 * a presentation, which is half the point.
 */
export function Deck() {
  const editorRef = useRef<Editor | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inspectorOpen, setInspectorOpen] = useState(false)

  // Stable slide _keys derived from the value. We only read them once; the
  // value is a const fixture for v1. If we ever add live "new slide" actions
  // we'll lift this into state and update from a mutation listener.
  const slideKeys = useMemo(
    () =>
      deckValue
        .map((slide) => slide._key)
        .filter((key): key is string => typeof key === 'string'),
    [],
  )

  const totalSlides = slideKeys.length

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSlides) {
        return
      }
      setCurrentIndex(index)
      const hashKey = slideKeys[index]
      if (hashKey) {
        window.history.replaceState(null, '', `#${hashKey}`)
      }
    },
    [slideKeys, totalSlides],
  )

  // Read initial slide from hash, listen for hash changes.
  useEffect(() => {
    const fromHash = () => {
      const key = window.location.hash.slice(1)
      const idx = slideKeys.indexOf(key)
      if (idx >= 0) {
        setCurrentIndex(idx)
      }
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [slideKeys])

  // Slide navigation lives in a behavior registered via DeckNavPlugin -
  // see plugin.deck-nav.tsx. Cmd/Ctrl + Right/Left advance the deck;
  // Cmd/Ctrl + Up/Down jump to the first/last slide. The behavior runs
  // inside the editor's keyboard pipeline so it doesn't fight the editor's
  // own keydown handlers.
  const navCallbacks = useMemo(
    () => ({
      onNext: () => goTo(currentIndex + 1),
      onPrev: () => goTo(currentIndex - 1),
      onFirst: () => goTo(0),
      onLast: () => goTo(totalSlides - 1),
    }),
    [currentIndex, goTo, totalSlides],
  )

  const contextValue = useMemo(
    () => ({currentIndex, slideKeys}),
    [currentIndex, slideKeys],
  )

  return (
    <SlideIndexContext.Provider value={contextValue}>
      <div className="relative min-h-screen w-full overflow-hidden bg-stone-50 dark:bg-stone-950">
        <EditorProvider
          initialConfig={{
            initialValue: [...deckValue],
            schemaDefinition: deckSchemaDefinition,
            keyGenerator,
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'error') {
                console.error('[deck]', event)
              }
            }}
          />
          <SlidePlugin />
          <DeckContainerPlugins />
          <DeckNavPlugin {...navCallbacks} />

          <DeckEditable />

          <DeckChrome
            currentIndex={currentIndex}
            totalSlides={totalSlides}
            inspectorOpen={inspectorOpen}
            onPrev={() => goTo(currentIndex - 1)}
            onNext={() => goTo(currentIndex + 1)}
            onToggleInspector={() => setInspectorOpen((open) => !open)}
          />

          <ValueInspector
            open={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
          />
        </EditorProvider>
      </div>
    </SlideIndexContext.Provider>
  )
}

/**
 * The editable surface. Pulled out as its own component so the
 * `useShikiDecorations` hook (which calls `useEditor`) sits inside the
 * `<EditorProvider>` tree.
 */
function DeckEditable() {
  const rangeDecorations = useShikiDecorations()
  return (
    <PortableTextEditable
      className="deck-editable relative block h-screen w-full focus:outline-none"
      rangeDecorations={
        rangeDecorations as Parameters<
          typeof PortableTextEditable
        >[0]['rangeDecorations']
      }
      renderAnnotation={renderAnnotation}
      renderDecorator={renderDecorator}
      renderListItem={renderListItem}
      renderPlaceholder={renderPlaceholder}
      renderStyle={renderStyle}
    />
  )
}

const renderDecorator: RenderDecoratorFunction = (props) => {
  switch (props.value) {
    case 'strong':
      return <strong>{props.children}</strong>
    case 'em':
      return <em>{props.children}</em>
    case 'code':
      return (
        <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-base text-pink-700 dark:bg-stone-800 dark:text-pink-300">
          {props.children}
        </code>
      )
    default:
      return <>{props.children}</>
  }
}

const renderAnnotation: RenderAnnotationFunction = (props) => {
  if (props.schemaType.name === 'link') {
    return (
      <span className="underline text-blue-700 dark:text-blue-300">
        {props.children}
      </span>
    )
  }
  return <>{props.children}</>
}

const renderListItem: RenderListItemFunction = (props) => {
  if (props.value === 'bullet') {
    return (
      <span className="flex items-baseline gap-3">
        <span aria-hidden className="text-stone-400">
          •
        </span>
        <span className="flex-1">{props.children}</span>
      </span>
    )
  }
  if (props.value === 'number') {
    return (
      <span className="flex items-baseline gap-3">
        <span aria-hidden className="text-stone-400 font-mono text-sm">
          {(props.path[props.path.length - 1] as number) + 1}.
        </span>
        <span className="flex-1">{props.children}</span>
      </span>
    )
  }
  return <>{props.children}</>
}

const renderStyle: RenderStyleFunction = (props) => {
  // Slides own their own style rendering via defineTextBlock. Anything that
  // reaches this top-level handler is a fallback - just pass through.
  return <>{props.children}</>
}

const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span className="text-stone-400">Type something…</span>
)
