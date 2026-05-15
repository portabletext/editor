import {useEditor} from '@portabletext/editor'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {useEffect} from 'react'
import {
  createDeckNavBehaviors,
  type DeckNavCallbacks,
} from './behavior.deck-nav'

/**
 * Registers the deck's slide-navigation behaviors against the editor.
 *
 * Cmd/Ctrl + Right/Left advance/retreat. Cmd/Ctrl + Up/Down jump to the
 * first/last slide. Modeled as proper editor behaviors so they participate
 * in the keyboard shortcut pipeline (no document-level event listeners,
 * no fighting with the editor's own keydown handlers).
 */
export function DeckNavPlugin(props: DeckNavCallbacks) {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createDeckNavBehaviors(
      {
        nextSlide: createKeyboardShortcut({
          default: [
            {
              key: 'ArrowRight',
              meta: true,
              ctrl: false,
              shift: false,
              alt: false,
            },
            {
              key: 'ArrowRight',
              meta: false,
              ctrl: true,
              shift: false,
              alt: false,
            },
          ],
        }),
        prevSlide: createKeyboardShortcut({
          default: [
            {
              key: 'ArrowLeft',
              meta: true,
              ctrl: false,
              shift: false,
              alt: false,
            },
            {
              key: 'ArrowLeft',
              meta: false,
              ctrl: true,
              shift: false,
              alt: false,
            },
          ],
        }),
        firstSlide: createKeyboardShortcut({
          default: [
            {key: 'ArrowUp', meta: true, ctrl: false, shift: false, alt: false},
            {key: 'ArrowUp', meta: false, ctrl: true, shift: false, alt: false},
          ],
        }),
        lastSlide: createKeyboardShortcut({
          default: [
            {
              key: 'ArrowDown',
              meta: true,
              ctrl: false,
              shift: false,
              alt: false,
            },
            {
              key: 'ArrowDown',
              meta: false,
              ctrl: true,
              shift: false,
              alt: false,
            },
          ],
        }),
      },
      props,
    )

    const unregisters = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregister of unregisters) {
        unregister()
      }
    }
  }, [editor, props])

  return null
}
