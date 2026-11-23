import type {SyntheticBehaviorEvent} from '../behaviors/behavior.types.event'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {pointRef} from '../engine/editor/point-ref'
import {unhangRange} from '../engine/editor/unhang-range'
import type {PointRef} from '../engine/interfaces/point-ref'
import {resolveSelection} from '../internal-utils/apply-selection'
import {deleteRange} from '../internal-utils/delete-range'
import type {PickFromUnion} from '../type-utils'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isEqualSelections} from '../utils/util.is-equal-selections'

export const prepareInsertBlocks = Symbol('insert.blocks.prepare')
export type InsertBlocksPreparation = {
  pointRef?: PointRef
  removeEmptyStartBlock: boolean
}

export function prepareInsertBlocksOperation(
  editor: PortableTextEditorEngine,
  event: PickFromUnion<SyntheticBehaviorEvent, 'type', 'insert.blocks'>,
  preparation: InsertBlocksPreparation,
) {
  const at = resolveInsertBlocksTarget(editor.snapshot, event)
  if (!at) {
    return
  }
  deleteRange(editor, at, {
    selection:
      event.at &&
      !isEqualSelections(event.at, editor.snapshot.context.selection)
        ? 'preserve'
        : 'collapse-to-start',
    removeEmptyStartBlock: preparation.removeEmptyStartBlock,
    onDelete: (point) => {
      preparation.pointRef = pointRef(editor, point, {affinity: 'forward'})
    },
  })
}

export function resolveInsertBlocksTarget(
  snapshot: EditorSnapshot,
  event: PickFromUnion<SyntheticBehaviorEvent, 'type', 'insert.blocks'>,
) {
  const at = event.at
    ? resolveSelection({snapshot}, event.at)
    : snapshot.context.selection
  return at ? unhangRange(snapshot, at) : null
}
