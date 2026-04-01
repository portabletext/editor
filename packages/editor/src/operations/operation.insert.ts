import {toSlateBlock} from '../internal-utils/values'
import {keyedPathToIndexedPath} from '../paths/keyed-path-to-indexed-path'
import {end as editorEnd} from '../slate/editor/end'
import {start as editorStart} from '../slate/editor/start'
import type {Path} from '../slate/interfaces/path'
import {parentPath} from '../slate/path/parent-path'
import {parseBlock} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const insertOperationImplementation: OperationImplementation<
  'insert'
> = ({context, operation}) => {
  const {editor} = operation

  const referenceIndexedPath = keyedPathToIndexedPath(
    editor,
    operation.at,
    editor.blockIndexMap,
  )

  if (!referenceIndexedPath) {
    return
  }

  const referenceIndex = referenceIndexedPath.at(-1)

  if (referenceIndex === undefined) {
    return
  }

  const parent = parentPath(referenceIndexedPath)
  const baseIndex =
    operation.position === 'after' ? referenceIndex + 1 : referenceIndex

  for (let i = 0; i < operation.items.length; i++) {
    const item = operation.items[i]!

    const parsedBlock = parseBlock({
      block: item,
      context,
      options: {
        normalize: true,
        removeUnusedMarkDefs: true,
        validateFields: true,
      },
    })

    if (!parsedBlock) {
      continue
    }

    const node = toSlateBlock(parsedBlock, {schemaTypes: context.schema})
    const insertPath: Path = [...parent, baseIndex + i]

    editor.apply({type: 'insert_node', path: insertPath, node})
  }

  if (operation.items.length > 0 && operation.select !== 'none') {
    const selectPosition = operation.select ?? 'start'
    const firstInsertPath: Path = [...parent, baseIndex]
    const point =
      selectPosition === 'start'
        ? editorStart(editor, firstInsertPath)
        : editorEnd(editor, [...parent, baseIndex + operation.items.length - 1])

    editor.apply({
      type: 'set_selection',
      properties: editor.selection,
      newProperties: {anchor: point, focus: point},
    })
  }
}
