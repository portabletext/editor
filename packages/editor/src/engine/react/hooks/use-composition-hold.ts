import type {PortableTextSpan} from '@portabletext/schema'
import {useContext, useReducer, useRef} from 'react'
import {IS_ANDROID} from '../../dom/utils/environment'
import {rangeRef} from '../../editor/range-ref'
import type {Editor} from '../../interfaces/editor'
import type {Path} from '../../interfaces/path'
import type {Range} from '../../interfaces/range'
import type {RangeRef} from '../../interfaces/range-ref'
import type {DecoratedRange} from '../../interfaces/text'
import {pathEquals} from '../../path/path-equals'
import {isCollapsedRange} from '../../range/is-collapsed-range'
import {getTextDecorations} from '../../text/get-text-decorations'
import {EngineSelectorContext} from './use-engine-selector'
import {useEngineStatic} from './use-engine-static'
import {useIsomorphicLayoutEffect} from './use-isomorphic-layout-effect'

type CompositionHold = {
  decorations: DecoratedRange[]
  // Remote edits move the composing leaf and the IME's input grows it.
  interval: RangeRef
  leafIndex: number
}

export type ComposingLeaf = {start: number; end: number; index: number}

// Every write that clears `editor.composing` goes through here, or a span
// holding its composing leaf is never told to render again.
export function endComposition(editor: Editor) {
  if (!editor.composing) {
    return
  }
  editor.composing = false
  if (IS_ANDROID) {
    editor.onContextChange?.()
  }
}

// Re-rendering the leaf the IME composes in breaks the composition, so it
// keeps the decorations it had at `compositionstart`, as `prosemirror-view`'s
// `protectLocalComposition` does.
export const useCompositionHold: (
  text: PortableTextSpan,
  path: Path,
  decorations: DecoratedRange[],
) => {decorations: DecoratedRange[]; composingLeaf: ComposingLeaf | null} =
  IS_ANDROID
    ? useAndroidCompositionHold
    : (_text, _path, decorations) => ({decorations, composingLeaf: null})

function useAndroidCompositionHold(
  text: PortableTextSpan,
  path: Path,
  decorations: DecoratedRange[],
): {decorations: DecoratedRange[]; composingLeaf: ComposingLeaf | null} {
  const editor = useEngineStatic()
  const {addEventListener} = useContext(EngineSelectorContext)
  const [, forceRender] = useReducer((count: number) => count + 1, 0)
  const committed = useRef<{
    text: PortableTextSpan
    decorations: DecoratedRange[]
  } | null>(null)
  const hold = useRef<CompositionHold | null>(null)

  if (!editor.composing) {
    hold.current?.interval.unref()
    hold.current = null
  } else if (hold.current === null && committed.current) {
    hold.current = startHold(
      editor,
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

  useIsomorphicLayoutEffect(
    () => () => {
      hold.current?.interval.unref()
    },
    [],
  )

  useIsomorphicLayoutEffect(() => {
    if (!holding) {
      return
    }
    // `Text` is memoized, so the span subscribes itself. The editable renders
    // in the same commit, which makes `RestoreDOM` stop observing before
    // React swaps the leaf.
    return addEventListener(() => {
      if (!editor.composing) {
        forceRender()
      }
    })
  }, [addEventListener, editor, holding])

  if (hold.current === null) {
    return {decorations, composingLeaf: null}
  }

  const {interval, leafIndex} = hold.current

  if (
    !interval.current ||
    isCollapsedRange(interval.current) ||
    !pathEquals(interval.current.anchor.path, path)
  ) {
    // A remote edit removed the span or all of the text the IME composes in.
    // The leaf rendered in its place has a key of its own, so the hold ends
    // for the rest of the composition rather than claim that leaf once the
    // IME writes into it again.
    interval.unref()
    return {decorations, composingLeaf: null}
  }

  const [start, end] = offsets(interval.current)

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
    held.push({
      ...decoration,
      anchor: {path, offset: start},
      focus: {path, offset: end},
    })
  }

  // An empty decoration over the composing leaf keeps it one leaf when no
  // decoration bounds it any more.
  held.push({anchor: {path, offset: start}, focus: {path, offset: end}})

  return {decorations: held, composingLeaf: {start, end, index: leafIndex}}
}

function startHold(
  editor: Editor,
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
  const written = text.text.length - committed.text.text.length
  const insertion = selection.focus.offset - written
  let leafStart = 0
  let after: {start: number; end: number; leafIndex: number} | null = null
  let composing: {start: number; end: number; leafIndex: number} | null = null
  const leaves = getTextDecorations(committed.text, committed.decorations)

  for (const [leafIndex, {leaf}] of leaves.entries()) {
    const leafEnd = leafStart + leaf.text.length
    // As `findCompositionNode` does, prefer the text before the caret.
    if (leafStart < insertion && insertion <= leafEnd) {
      composing = {start: leafStart, end: leafEnd, leafIndex}
      break
    }
    if (leafStart === insertion && after === null) {
      after = {start: leafStart, end: leafEnd, leafIndex}
    }
    leafStart = leafEnd
  }

  composing ??= after

  if (!composing) {
    return null
  }

  const {start, end, leafIndex} = composing
  const heldEnd = Math.min(text.text.length, Math.max(start, end + written))

  // A renderer may wrap a decoration's first or last fragment differently, so
  // the leaf keeps the `isFirst` and `isLast` it was rendered with, which an
  // empty leaf from a collapsed decoration at either end may have taken.
  const fragments = new Map(
    (
      leaves[leafIndex]!.leaf as PortableTextSpan & {
        rangeDecorations?: Array<{
          rangeDecoration: unknown
          isFirst: boolean
          isLast: boolean
        }>
      }
    ).rangeDecorations?.map((entry) => [entry.rangeDecoration, entry]),
  )

  return {
    // A leaf is where no decoration starts or ends, so a decoration touching
    // it covers all of it.
    decorations: committed.decorations.flatMap((decoration) => {
      const [decorationStart, decorationEnd] = offsets(decoration)
      if (
        decorationStart > start ||
        end > decorationEnd ||
        decorationStart === decorationEnd
      ) {
        return []
      }
      const fragment = fragments.get(
        (decoration as {rangeDecoration?: unknown}).rangeDecoration,
      )
      const merge = decoration.merge
      return [
        {
          ...decoration,
          isRangeStart: fragment?.isFirst ?? false,
          isRangeEnd: fragment?.isLast ?? false,
          // Kept out of an empty leaf at either end, which would otherwise
          // take the flags from the composing leaf.
          merge:
            merge &&
            ((leaf: PortableTextSpan, payload: object) => {
              if (leaf.text.length > 0) {
                merge(leaf, payload)
              }
            }),
        },
      ]
    }),
    // Outward, so the leaf keeps the IME's input at either end, including
    // a commit that removes and reinserts all of its text.
    interval: rangeRef(
      editor,
      {anchor: {path, offset: start}, focus: {path, offset: heldEnd}},
      {affinity: 'outward'},
    ),
    leafIndex,
  }
}

function offsets(decoration: Range): [number, number] {
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
