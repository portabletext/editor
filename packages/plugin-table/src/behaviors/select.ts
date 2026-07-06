import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {comparePoints, getEnclosingBlock} from '@portabletext/editor/traversal'
import {isEqualPaths} from '@portabletext/editor/utils'
import {cellEndPoint, cellStartPoint} from '../cell-points'
import {isCell, isTable} from './types'

/**
 * Clamps selections that stray into the table's chrome band. During a drag
 * the browser maps the pointer to the nearest document position
 * continuously, and the gutters, handle overhangs, and lane padding resolve
 * to container-level points on the table, so a text drag inside a cell
 * leaps to a table-spanning selection the moment the pointer crosses the
 * chrome. The pathological shape is precise: the anchor resolves inside a
 * cell while the focus resolves inside the same table but inside no cell.
 *
 * The clamp re-addresses instead of suppressing: keep the previous focus
 * when it lives in the same table (the selection freezes over chrome and
 * resumes in the next cell), otherwise fall back to the anchor cell's edge
 * in the drag's direction. The re-raised focus is always a cell-resident
 * point, so the re-raise cannot re-match the guard.
 */
export const selectBehaviors = [
  defineBehavior({
    on: 'select',
    guard: ({snapshot, event}) => {
      if (!event.at) {
        return false
      }

      const anchorCell = getEnclosingBlock(snapshot, event.at.anchor.path, {
        match: isCell,
      })
      if (!anchorCell) {
        return false
      }

      const focusCell = getEnclosingBlock(snapshot, event.at.focus.path, {
        match: isCell,
      })
      if (focusCell) {
        return false
      }

      const focusTable = getEnclosingBlock(snapshot, event.at.focus.path, {
        match: isTable,
      })
      const anchorTable = getEnclosingBlock(snapshot, anchorCell.path, {
        match: isTable,
      })
      if (
        !focusTable ||
        !anchorTable ||
        !isEqualPaths(focusTable.path, anchorTable.path)
      ) {
        return false
      }

      const previousFocus = snapshot.context.selection?.focus
      const previousFocusCell = previousFocus
        ? getEnclosingBlock(snapshot, previousFocus.path, {match: isCell})
        : undefined
      const previousFocusTable = previousFocusCell
        ? getEnclosingBlock(snapshot, previousFocusCell.path, {match: isTable})
        : undefined
      const clampedFocus =
        previousFocus &&
        previousFocusTable &&
        isEqualPaths(previousFocusTable.path, anchorTable.path)
          ? previousFocus
          : event.at.backward
            ? cellStartPoint(snapshot, anchorCell.path)
            : cellEndPoint(snapshot, anchorCell.path)
      if (!clampedFocus) {
        return false
      }

      return {
        anchor: event.at.anchor,
        focus: clampedFocus,
        backward: comparePoints(snapshot, clampedFocus, event.at.anchor) === -1,
      }
    },
    actions: [(_, at) => [raise({type: 'select', at})]],
  }),
]
