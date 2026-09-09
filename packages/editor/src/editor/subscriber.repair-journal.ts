import type {PortableTextBlock} from '@portabletext/schema'
import {hasRemoteFrame, isInNormalization} from '../engine/core/apply-context'
import {subscribeToOperations} from '../engine/core/operation-channel'
import type {EngineOperation} from '../engine/interfaces/operation'
import {deepEqualJson} from '../internal-utils/deep-equal-json'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

const REPAIR_JOURNAL_CAP = 100

type RepairJournal = PortableTextEditorEngine['repairJournal']
export type RepairJournalEntry =
  RepairJournal extends Map<string, infer Entry> ? Entry : never
type JournalableOperation = Exclude<EngineOperation, {type: 'set.selection'}>

/**
 * Wires {@link updateRepairJournal} to the operation channel, wired like
 * `subscribeUpdateValue` (see `create-editor-engine`).
 */
export function subscribeRepairJournal(
  editor: PortableTextEditorEngine,
): () => void {
  return subscribeToOperations(editor, (event) => {
    if (event.operation.type === 'set.selection') {
      return
    }

    updateRepairJournal(editor.repairJournal, event.operation, {
      isIntakeRepair:
        isInNormalization(event.context) && hasRemoteFrame(event.context),
      beforeValue: event.beforeValue,
      afterValue: editor.snapshot.context.value,
      blockIndexMap: editor.blockIndexMap,
    })
  })
}

/**
 * Records or retires intake-repair entries for one operation. An intake
 * repair (normalization firing while a remote frame is on the stack: the
 * exact signature of a repair fixing up content the engine just adopted,
 * never a local edit's own normalization) either continues the chain
 * already open on its owning top-level block or opens a new one. Any
 * other operation retires the entry it touches: a local edit reaching the
 * block, or a later remote write, both mean the journaled verdict no
 * longer describes the block's state.
 */
export function updateRepairJournal(
  journal: RepairJournal,
  operation: JournalableOperation,
  {
    isIntakeRepair,
    beforeValue,
    afterValue,
    blockIndexMap,
  }: {
    isIntakeRepair: boolean
    beforeValue: ReadonlyArray<PortableTextBlock>
    afterValue: ReadonlyArray<PortableTextBlock>
    blockIndexMap: ReadonlyMap<string, number>
  },
): void {
  if (!isIntakeRepair) {
    retireTouchedEntry(journal, operation, beforeValue)
    return
  }

  recordRepair(journal, operation, beforeValue, afterValue, blockIndexMap)
}

function retireTouchedEntry(
  journal: RepairJournal,
  operation: JournalableOperation,
  beforeValue: ReadonlyArray<PortableTextBlock>,
): void {
  if (journal.size === 0) {
    return
  }

  if (operation.path.length === 0) {
    journal.clear()
    return
  }

  const segment = operation.path[0]!
  const key = isKeyedSegment(segment)
    ? segment._key
    : typeof segment === 'number'
      ? operation.type === 'insert'
        ? operation.node._key
        : beforeValue[segment]?._key
      : undefined

  if (key !== undefined) {
    journal.delete(key)
  }
}

function recordRepair(
  journal: RepairJournal,
  operation: JournalableOperation,
  beforeValue: ReadonlyArray<PortableTextBlock>,
  afterValue: ReadonlyArray<PortableTextBlock>,
  blockIndexMap: ReadonlyMap<string, number>,
): void {
  const segment = operation.path[0]
  if (segment === undefined) {
    return
  }

  const index =
    typeof segment === 'number'
      ? segment
      : isKeyedSegment(segment)
        ? blockIndexMap.get(segment._key)
        : undefined

  if (index === undefined) {
    return
  }

  const beforeBlock = beforeValue[index]
  if (!beforeBlock) {
    return
  }

  const afterBlock = afterValue[index]
  if (!afterBlock) {
    return
  }

  const chained = journal.get(beforeBlock._key)

  if (chained && deepEqualJson(chained.afterShape, beforeBlock)) {
    if (afterBlock._key !== beforeBlock._key) {
      journal.delete(beforeBlock._key)
    }
    journal.set(afterBlock._key, {
      beforeShape: chained.beforeShape,
      afterShape: afterBlock,
    })
    return
  }

  if (!journal.has(afterBlock._key) && journal.size >= REPAIR_JOURNAL_CAP) {
    const oldestKey = journal.keys().next().value
    if (oldestKey !== undefined) {
      journal.delete(oldestKey)
    }
  }

  journal.set(afterBlock._key, {
    beforeShape: beforeBlock,
    afterShape: afterBlock,
  })
}
