import {Editor, Path, Text as SlateText, Transforms} from 'slate'
import {debugWithName} from '../../internal-utils/debug'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import type {EditorActor} from '../editor-machine'

const debug = debugWithName('plugin:withPortableTextBlockStyle')

export function createWithPortableTextBlockStyle(
  editorActor: EditorActor,
  types: PortableTextMemberSchemaTypes,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  const defaultStyle = types.styles[0].value
  return function withPortableTextBlockStyle(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    // Extend Slate's default normalization to reset split node to normal style
    // if there is no text at the right end of the split.
    const {normalizeNode} = editor

    editor.normalizeNode = (nodeEntry) => {
      const [, path] = nodeEntry

      for (const op of editor.operations) {
        if (
          op.type === 'split_node' &&
          op.path.length === 1 &&
          editor.isTextBlock(op.properties) &&
          op.properties.style !== defaultStyle &&
          op.path[0] === path[0] &&
          !Path.equals(path, op.path)
        ) {
          const [child] = Editor.node(editor, [op.path[0] + 1, 0])
          if (SlateText.isText(child) && child.text === '') {
            debug(`Normalizing split node to ${defaultStyle} style`, op)
            editorActor.send({type: 'normalizing'})
            Transforms.setNodes(
              editor,
              {style: defaultStyle},
              {at: [op.path[0] + 1], voids: false},
            )
            editorActor.send({type: 'done normalizing'})
            return
          }
        }
      }

      normalizeNode(nodeEntry)
    }

    return editor
  }
}
