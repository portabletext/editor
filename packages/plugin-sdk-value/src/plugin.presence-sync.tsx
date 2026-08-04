import {
  useEditor,
  useEditorSelector,
  type EditorSelection,
  type RangeDecoration,
} from '@portabletext/editor'
import {getSelection} from '@portabletext/editor/selectors'
import {isEqualSelections} from '@portabletext/editor/utils'
import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react'
import {
  recordCursorMove,
  toRangeDecorations,
  type CursorOverride,
  type RemoteCursor,
} from './presence-cursors'

/**
 * Options for {@link useRemoteCursors}.
 *
 * @public
 */
export interface UseRemoteCursorsOptions<TCursor extends RemoteCursor> {
  /**
   * The remote participants to draw. Keep this array referentially stable, for
   * example with `useMemo`, so that decorations are not rebuilt on every
   * render.
   */
  cursors: readonly TCursor[]
  renderCursor: (cursor: TCursor) => (props: PropsWithChildren) => ReactElement
}

/**
 * The local user's selection, deduped by value.
 *
 * The editor produces a fresh selection object on every snapshot change, so
 * subscribing to it directly would report presence far more often than the
 * caret actually moves.
 *
 * @public
 */
export function useLocalSelection(): EditorSelection {
  const editor = useEditor()
  // Direction is ignored, which `isEqualSelections` already does: a caret is
  // drawn at the focus point, so reversing a selection moves nothing.
  return useEditorSelector(editor, getSelection, isEqualSelections)
}

/**
 * Turns remote cursors into range decorations, keeping each caret anchored as
 * the local user edits.
 *
 * Knows nothing about Sanity or the SDK, so it can also drive carets from
 * another source or from a test fixture. `useSDKPresenceCursors` is the version
 * wired to SDK presence.
 *
 * @public
 */
export function useRemoteCursors<TCursor extends RemoteCursor>(
  options: UseRemoteCursorsOptions<TCursor>,
): RangeDecoration[] {
  const {cursors, renderCursor} = options
  // Only the moved carets need to survive a render. Where every caret is drawn
  // is derived from them plus the latest report, so there is no state to keep
  // in step with the incoming cursors.
  const [overrides, setOverrides] =
    useState<ReadonlyMap<string, CursorOverride>>(EMPTY_OVERRIDES)

  const onCursorMoved = useCallback(
    (cursor: TCursor, selection: EditorSelection) => {
      setOverrides((previous) =>
        recordCursorMove(previous, cursors, cursor, selection),
      )
    },
    [cursors],
  )

  return useMemo(
    () => toRangeDecorations({cursors, overrides, renderCursor, onCursorMoved}),
    [cursors, overrides, renderCursor, onCursorMoved],
  )
}

const EMPTY_OVERRIDES: ReadonlyMap<string, CursorOverride> = new Map()
