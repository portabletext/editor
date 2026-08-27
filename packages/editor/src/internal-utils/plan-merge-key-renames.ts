import {
  isSpan,
  type PortableTextTextBlock,
  type Schema,
} from '@portabletext/schema'
import {isEqualMarks} from './equality'

/**
 * A rename to apply to one of `mergingBlock`'s children before the merge.
 * `props` only carries the keys that actually change: `_key` when the
 * child's key collides with the destination, `marks` when one of its
 * marks referenced a markDef that got renamed.
 */
export type MergeChildRename = {
  childKey: string
  props: {_key?: string; marks?: Array<string>}
}

/** A rename to apply to one of `mergingBlock`'s markDefs before the merge. */
export type MergeMarkDefRename = {
  markDefKey: string
  newKey: string
}

/**
 * A block merge folds `mergingBlock`'s children (and markDefs) into
 * `destinationBlock` by key. Any key the merging block shares with the
 * destination has to be renamed before the merge, or the engine's own
 * collision handling mints a fresh key for it, which reads on the wire as
 * that node being destroyed and a new one created instead of moved.
 *
 * Pure: computes the renames and the block they produce without touching
 * an editor. Callers raise or apply the renames themselves, ahead of the
 * merge, against the still-living `mergingBlock`.
 */
export function planMergeKeyRenames(args: {
  context: {schema: Schema; keyGenerator: () => string}
  mergingBlock: PortableTextTextBlock
  destinationBlock: PortableTextTextBlock
}): {
  renamedBlock: PortableTextTextBlock
  childRenames: Array<MergeChildRename>
  markDefRenames: Array<MergeMarkDefRename>
} {
  const {context, mergingBlock, destinationBlock} = args

  const destinationChildKeys = new Set(
    destinationBlock.children.map((child) => child._key),
  )
  const destinationMarkDefKeys = new Set(
    (destinationBlock.markDefs ?? []).map((markDef) => markDef._key),
  )

  const markDefKeyMap = new Map<string, string>()
  const renamedMarkDefs = mergingBlock.markDefs?.map((markDef) => {
    if (!destinationMarkDefKeys.has(markDef._key)) {
      return markDef
    }

    const newKey = context.keyGenerator()
    markDefKeyMap.set(markDef._key, newKey)
    return {...markDef, _key: newKey}
  })

  const markDefRenames: Array<MergeMarkDefRename> = []
  for (const markDef of mergingBlock.markDefs ?? []) {
    const newKey = markDefKeyMap.get(markDef._key)
    if (newKey) {
      markDefRenames.push({markDefKey: markDef._key, newKey})
    }
  }

  const childRenames: Array<MergeChildRename> = []
  const renamedChildren = mergingBlock.children.map((child) => {
    const currentMarks = isSpan(context, child) ? child.marks : undefined
    const remappedMarks = currentMarks?.map(
      (mark) => markDefKeyMap.get(mark) ?? mark,
    )
    const marksChanged = Boolean(
      remappedMarks && !isEqualMarks(remappedMarks, currentMarks),
    )

    const newKey = destinationChildKeys.has(child._key)
      ? context.keyGenerator()
      : child._key

    const props: MergeChildRename['props'] = {}
    if (newKey !== child._key) {
      props['_key'] = newKey
    }
    if (marksChanged) {
      props['marks'] = remappedMarks
    }

    if (Object.keys(props).length > 0) {
      childRenames.push({childKey: child._key, props})
    }

    return marksChanged
      ? {...child, _key: newKey, marks: remappedMarks}
      : {...child, _key: newKey}
  })

  return {
    renamedBlock: {
      ...mergingBlock,
      children: renamedChildren,
      ...(mergingBlock.markDefs ? {markDefs: renamedMarkDefs} : {}),
    },
    childRenames,
    markDefRenames,
  }
}
