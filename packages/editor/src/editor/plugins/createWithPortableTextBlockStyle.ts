import {Editor, Path, Text as SlateText, Transforms, type Node} from 'slate'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
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

    editor.pteHasBlockStyle = (style: string): boolean => {
      if (!editor.selection) {
        return false
      }
      const selectedBlocks = [
        ...Editor.nodes(editor, {
          at: editor.selection,
          match: (node) => editor.isTextBlock(node) && node.style === style,
        }),
      ]
      if (selectedBlocks.length > 0) {
        return true
      }
      return false
    }

    editor.pteToggleBlockStyle = (blockStyle: string): void => {
      if (!editor.selection) {
        return
      }
      const selectedBlocks = [
        ...Editor.nodes(editor, {
          at: editor.selection,
          match: (node) => editor.isTextBlock(node),
        }),
      ]
      selectedBlocks.forEach(([node, path]) => {
        if (editor.isTextBlock(node) && node.style === blockStyle) {
          debug(`Unsetting block style '${blockStyle}'`)
          Transforms.setNodes(
            editor,
            {...node, style: defaultStyle} as Partial<Node>,
            {
              at: path,
            },
          )
        } else {
          if (blockStyle) {
            debug(`Setting style '${blockStyle}'`)
          } else {
            debug('Setting default style', defaultStyle)
          }
          Transforms.setNodes(
            editor,
            {
              ...node,
              style: blockStyle || defaultStyle,
            } as Partial<Node>,
            {at: path},
          )
        }
      })
      editor.onChange()
    }
    return editor
  }
}
