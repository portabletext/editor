import type {PortableTextSpan} from '@portabletext/schema'
import {useReducer, useRef} from 'react'
import {DOMEditor} from '../../dom/plugin/dom-editor'
import {IS_ANDROID} from '../../dom/utils/environment'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {pathEquals} from '../../path/path-equals'
import {isCollapsedRange} from '../../range/is-collapsed-range'
import {getTextDecorations} from '../../text/get-text-decorations'
import {useEngineStatic} from './use-engine-static'
import {useIsomorphicLayoutEffect} from './use-isomorphic-layout-effect'

// SPIKE ONLY (spike/android-split-control, never merged): on only for a page
// opened with `hold=1`, so one build serves both this editor and main's.
// Without it `useCompositionHold` returns the decorations it is given and
// `Text` keys its leaves as on main.
const SPIKE_HOLD_COMPOSING =
  IS_ANDROID &&
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('hold') === '1'

type CompositionHold = {
  /** The decorations that covered the composing leaf when the hold began. */
  decorations: DecoratedRange[]
  textLength: number
  start: number
  end: number
  leafIndex: number
}

/**
 * While the IME composes in this span, the leaf it composes in keeps the
 * decorations it had when the composition started, as `prosemirror-view`'s
 * `protectLocalComposition` does. A decoration that reaches into the leaf
 * renders on the rest of the span at once. On `compositionend` the span
 * renders again with its current decorations.
 */
export function useCompositionHold(
  text: PortableTextSpan,
  path: Path,
  decorations: DecoratedRange[],
): {
  decorations: DecoratedRange[]
  composingLeaf: {start: number; end: number; index: number} | null
} {
  const editor = useEngineStatic()
  const [, forceRender] = useReducer((count: number) => count + 1, 0)
  const committed = useRef<{
    text: PortableTextSpan
    decorations: DecoratedRange[]
  } | null>(null)
  const hold = useRef<CompositionHold | null>(null)

  if (SPIKE_HOLD_COMPOSING && !editor.composing) {
    hold.current = null
  }

  if (
    SPIKE_HOLD_COMPOSING &&
    editor.composing &&
    hold.current === null &&
    committed.current
  ) {
    hold.current = startHold(
      editor.snapshot.context.selection,
      path,
      text,
      committed.current,
    )
  }

  const holding = hold.current !== null

  useIsomorphicLayoutEffect(() => {
    if (hold.current === null) {
      committed.current = {text, decorations}
    }
  })

  useIsomorphicLayoutEffect(() => {
    if (!holding) {
      return
    }
    const root = DOMEditor.findDocumentOrShadowRoot(editor)
    // Bubbling to the document runs after the editable's own
    // `compositionend` handler, which clears `editor.composing` in a
    // microtask that is queued before this render. The editable renders in
    // the same commit, so `RestoreDOM` stops observing before React swaps
    // the leaf.
    const release = () => {
      editor.forceRender?.()
      forceRender()
    }
    root.addEventListener('compositionend', release)
    return () => {
      root.removeEventListener('compositionend', release)
    }
  }, [editor, holding])

  if (hold.current === null) {
    return {decorations, composingLeaf: null}
  }

  const {start, leafIndex} = hold.current
  const delta = text.text.length - hold.current.textLength
  const end = Math.min(
    text.text.length,
    Math.max(start, hold.current.end + delta),
  )

  if (start === end) {
    return {decorations, composingLeaf: null}
  }

  const held: DecoratedRange[] = []

  for (const decoration of decorations) {
    const [decorationStart, decorationEnd] = offsets(decoration)
    if (decorationEnd <= start || decorationStart >= end) {
      held.push(decoration)
      continue
    }
    if (decorationStart < start) {
      held.push(clip(decoration, path, decorationStart, start))
    }
    if (decorationEnd > end) {
      held.push(clip(decoration, path, end, decorationEnd))
    }
  }

  for (const decoration of hold.current.decorations) {
    held.push(clip(decoration, path, start, end))
  }

  // An empty decoration over the composing leaf keeps it one leaf when no
  // decoration bounds it any more.
  held.push({anchor: {path, offset: start}, focus: {path, offset: end}})

  return {decorations: held, composingLeaf: {start, end, index: leafIndex}}
}

function startHold(
  selection: {
    anchor: {path: Path; offset: number}
    focus: {path: Path; offset: number}
  } | null,
  path: Path,
  text: PortableTextSpan,
  committed: {text: PortableTextSpan; decorations: DecoratedRange[]},
): CompositionHold | null {
  if (
    !selection ||
    !isCollapsedRange(selection) ||
    !pathEquals(selection.focus.path, path)
  ) {
    return null
  }

  // The caret sits after what the IME has written since the last commit.
  const insertion =
    selection.focus.offset - (text.text.length - committed.text.text.length)
  let leafStart = 0
  let after: CompositionHold | null = null

  for (const [leafIndex, {leaf}] of getTextDecorations(
    committed.text,
    committed.decorations,
  ).entries()) {
    const leafEnd = leafStart + leaf.text.length
    const candidate = {
      // A leaf is where no decoration starts or ends, so a decoration
      // touching it covers all of it.
      decorations: committed.decorations.filter((decoration) => {
        const [decorationStart, decorationEnd] = offsets(decoration)
        return (
          decorationStart <= leafStart &&
          leafEnd <= decorationEnd &&
          decorationStart < decorationEnd
        )
      }),
      textLength: committed.text.text.length,
      start: leafStart,
      end: leafEnd,
      leafIndex,
    }
    // As `findCompositionNode` does, prefer the text before the caret.
    if (leafStart < insertion && insertion <= leafEnd) {
      return candidate
    }
    if (leafStart === insertion && after === null) {
      after = candidate
    }
    leafStart = leafEnd
  }

  return after
}

function offsets(decoration: DecoratedRange): [number, number] {
  return decoration.anchor.offset <= decoration.focus.offset
    ? [decoration.anchor.offset, decoration.focus.offset]
    : [decoration.focus.offset, decoration.anchor.offset]
}

function clip(
  decoration: DecoratedRange,
  path: Path,
  start: number,
  end: number,
): DecoratedRange {
  const [decorationStart, decorationEnd] = offsets(decoration)
  return {
    ...decoration,
    anchor: {path, offset: start},
    focus: {path, offset: end},
    isRangeStart: Boolean(decoration.isRangeStart) && start <= decorationStart,
    isRangeEnd: Boolean(decoration.isRangeEnd) && end >= decorationEnd,
  }
}
