import {defineBehavior, effect} from '@portabletext/editor/behaviors'
import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'

/**
 * Slide-navigation behaviors for the deck.
 *
 * Cmd/Ctrl + Arrow drives the slide index. We model this as a real behavior
 * (rather than a document-level keydown listener) so the editor's own
 * keyboard handlers don't fight us for these shortcuts.
 *
 * Slide navigation is presentation state - not part of the document - so
 * each behavior fires an `effect()` that calls the React setter passed in
 * by the deck. The behavior owns turning the keystroke into an intent; the
 * React state owns the slide index.
 */

export type DeckShortcuts = {
  nextSlide: KeyboardShortcut
  prevSlide: KeyboardShortcut
  firstSlide: KeyboardShortcut
  lastSlide: KeyboardShortcut
}

export type DeckNavCallbacks = {
  onNext: () => void
  onPrev: () => void
  onFirst: () => void
  onLast: () => void
}

export function createDeckNavBehaviors(
  shortcuts: DeckShortcuts,
  callbacks: DeckNavCallbacks,
) {
  return [
    defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => shortcuts.nextSlide.guard(event.originEvent),
      actions: [() => [effect(() => callbacks.onNext())]],
    }),
    defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => shortcuts.prevSlide.guard(event.originEvent),
      actions: [() => [effect(() => callbacks.onPrev())]],
    }),
    defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => shortcuts.firstSlide.guard(event.originEvent),
      actions: [() => [effect(() => callbacks.onFirst())]],
    }),
    defineBehavior({
      on: 'keyboard.keydown',
      guard: ({event}) => shortcuts.lastSlide.guard(event.originEvent),
      actions: [() => [effect(() => callbacks.onLast())]],
    }),
  ]
}
