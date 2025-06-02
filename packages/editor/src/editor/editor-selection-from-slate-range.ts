import {Range} from 'slate'
import {getPointBlock, getPointChild} from '../internal-utils/slate-utils'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import type {
  EditorSelection,
  IndexedEditorSelection,
  KeyedEditorSelection,
} from './editor-selection'

export function slateRangeToIndexedSelection({
  schema,
  editor,
  range,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  range: Range
}): IndexedEditorSelection | null {
  const [anchorBlock, anchorBlockPath] = getPointBlock({
    editor,
    point: range.anchor,
  })
  const anchorBlockIndex = anchorBlockPath?.at(0)
  const [focusBlock, focusBlockPath] = getPointBlock({
    editor,
    point: range.focus,
  })
  const focusBlockIndex = focusBlockPath?.at(0)

  if (
    !anchorBlock ||
    anchorBlockIndex === undefined ||
    !focusBlock ||
    focusBlockIndex === undefined
  ) {
    return null
  }

  const [, anchorChildPath] =
    anchorBlock._type === schema.block.name
      ? getPointChild({
          editor,
          point: range.anchor,
        })
      : [undefined, undefined]
  const anchorChildIndex = anchorChildPath?.at(1)

  const [, focusChildPath] =
    focusBlock._type === schema.block.name
      ? getPointChild({
          editor,
          point: range.focus,
        })
      : [undefined, undefined]
  const focusChildIndex = focusChildPath?.at(1)

  const selection: IndexedEditorSelection = {
    anchor: {
      path: [anchorBlockIndex],
      offset: range.anchor.offset,
    },
    focus: {
      path: [focusBlockIndex],
      offset: range.focus.offset,
    },
  }

  if (anchorChildIndex !== undefined) {
    selection.anchor.path.push(anchorChildIndex)
  }

  if (focusChildIndex !== undefined) {
    selection.focus.path.push(focusChildIndex)
  }

  return selection
}

export function slateRangeToKeyedSelection({
  schema,
  editor,
  range,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  range: Range
}): KeyedEditorSelection {
  const [anchorBlock] = getPointBlock({
    editor,
    point: range.anchor,
  })
  const [focusBlock] = getPointBlock({
    editor,
    point: range.focus,
  })

  if (!anchorBlock || !focusBlock) {
    return null
  }

  const [anchorChild] =
    anchorBlock._type === schema.block.name
      ? getPointChild({
          editor,
          point: range.anchor,
        })
      : [undefined, undefined]
  const [focusChild] =
    focusBlock._type === schema.block.name
      ? getPointChild({
          editor,
          point: range.focus,
        })
      : [undefined, undefined]

  const selection: EditorSelection = {
    anchor: {
      path: [{_key: anchorBlock._key}],
      offset: range.anchor.offset,
    },
    focus: {
      path: [{_key: focusBlock._key}],
      offset: range.focus.offset,
    },
    backward: Range.isBackward(range),
  }

  if (anchorChild) {
    selection.anchor.path.push('children')
    selection.anchor.path.push({_key: anchorChild._key})
  }

  if (focusChild) {
    selection.focus.path.push('children')
    selection.focus.path.push({_key: focusChild._key})
  }

  return selection
}
