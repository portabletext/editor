import {
  useEditor,
  useEditorSelector,
  type BlockObjectDefinition,
} from '@portabletext/editor'
import type {InsertPlacement} from '@portabletext/editor/behaviors'
import {useCallback} from 'react'

/**
 * @beta
 */
export function useBlockObjectButton(props: {
  definition: BlockObjectDefinition
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const onInsert = useCallback(
    ({
      value,
      placement,
    }: {
      value: {[key: string]: unknown}
      placement: InsertPlacement | undefined
    }) => {
      editor.send({
        type: 'insert.block object',
        blockObject: {
          name: props.definition.name,
          value,
        },
        placement: placement ?? 'auto',
      })
      editor.send({type: 'focus'})
    },
    [editor, props.definition.name],
  )

  return {disabled, onInsert}
}
