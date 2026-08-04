import type {EditorSelection, RangeDecoration} from '@portabletext/editor'
import {isEqualSelections} from '@portabletext/editor/utils'
import type {PropsWithChildren, ReactElement} from 'react'

/**
 * A remote participant's position in the editor.
 *
 * @public
 */
export interface RemoteCursor {
  /**
   * Identifies one editing session rather than one person. The same user in two
   * tabs reports two sessions and therefore draws two carets.
   */
  sessionId: string
  /**
   * The selection the participant last reported, or `null` when they have none.
   */
  selection: EditorSelection
}

/**
 * Where the local editor has pushed a remote caret, and the reported selection
 * it was pushed from.
 *
 * Typing above or inside a remote caret moves it, and the editor reports the
 * new position through `onMoved`. Keeping the selection it moved from is what
 * lets a later report from that participant take over again.
 *
 * @public
 */
export interface CursorOverride {
  reported: EditorSelection
  current: EditorSelection
}

/**
 * Options for {@link toRangeDecorations}.
 *
 * @public
 */
export interface RangeDecorationOptions<TCursor extends RemoteCursor> {
  cursors: readonly TCursor[]
  overrides: ReadonlyMap<string, CursorOverride>
  /**
   * Builds the component that draws one caret. The plugin has no opinion about
   * how a caret looks, so this is the caller's to provide.
   */
  renderCursor: (cursor: TCursor) => (props: PropsWithChildren) => ReactElement
  onCursorMoved?: (cursor: TCursor, selection: EditorSelection) => void
}

/**
 * Reduces a selection to a caret at its focus point.
 *
 * Presence answers where someone is, so decorating their whole selection would
 * highlight text the local user never selected. The Studio collapses the same
 * way, which keeps the two consistent when both are open on a document.
 *
 * @public
 */
export function collapseToCaret(selection: EditorSelection): EditorSelection {
  if (selection === null) {
    return null
  }
  return {anchor: selection.focus, focus: selection.focus}
}

/**
 * Where one remote caret should be drawn.
 *
 * A caret the local editor has moved keeps that moved position for as long as
 * the participant keeps reporting the same selection. A changed report wins,
 * because the participant has actually moved.
 *
 * @public
 */
export function resolveCursorSelection(
  cursor: RemoteCursor,
  override: CursorOverride | undefined,
): EditorSelection {
  if (override && isEqualSelections(override.reported, cursor.selection)) {
    return override.current
  }
  return collapseToCaret(cursor.selection)
}

/**
 * Records where the editor moved a caret to.
 *
 * Overrides for sessions that are no longer present are dropped, so a long
 * editing session does not accumulate one entry per participant who ever
 * visited. Returns the map untouched when nothing changed.
 *
 * @public
 */
export function recordCursorMove(
  overrides: ReadonlyMap<string, CursorOverride>,
  cursors: readonly RemoteCursor[],
  cursor: RemoteCursor,
  selection: EditorSelection,
): ReadonlyMap<string, CursorOverride> {
  const moved = collapseToCaret(selection)
  const existing = overrides.get(cursor.sessionId)
  const alreadyRecorded =
    existing !== undefined &&
    isEqualSelections(existing.reported, cursor.selection) &&
    isEqualSelections(existing.current, moved)

  const live = new Set(cursors.map((candidate) => candidate.sessionId))
  const staleKeys = [...overrides.keys()].filter((key) => !live.has(key))

  if (alreadyRecorded && staleKeys.length === 0) {
    return overrides
  }

  const next = new Map(overrides)
  for (const key of staleKeys) {
    next.delete(key)
  }
  next.set(cursor.sessionId, {reported: cursor.selection, current: moved})
  return next
}

/**
 * Maps remote cursors to range decorations for
 * `<PortableTextEditable rangeDecorations={...} />`.
 *
 * Participants with no caret to draw are skipped, so someone who clears their
 * selection stops drawing without being treated as having left.
 *
 * @public
 */
export function toRangeDecorations<TCursor extends RemoteCursor>(
  options: RangeDecorationOptions<TCursor>,
): RangeDecoration[] {
  const {cursors, overrides, renderCursor, onCursorMoved} = options
  const decorations: RangeDecoration[] = []

  for (const cursor of cursors) {
    const selection = resolveCursorSelection(
      cursor,
      overrides.get(cursor.sessionId),
    )
    if (selection === null) {
      continue
    }
    decorations.push({
      component: renderCursor(cursor),
      selection,
      payload: {sessionId: cursor.sessionId},
      onMoved: onCursorMoved
        ? (details) => onCursorMoved(cursor, details.newSelection)
        : undefined,
    })
  }

  return decorations
}
