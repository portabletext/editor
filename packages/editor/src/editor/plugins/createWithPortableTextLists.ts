import {Editor, Element, Text, Transforms, type Node} from 'slate'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import {debugWithName} from '../../utils/debug'

const debug = debugWithName('plugin:withPortableTextLists')

export function createWithPortableTextLists(
  types: PortableTextMemberSchemaTypes,
) {
  return function withPortableTextLists(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    editor.pteToggleListItem = (listItemStyle: string) => {
      const isActive = editor.pteHasListStyle(listItemStyle)
      if (isActive) {
        debug(`Remove list item '${listItemStyle}'`)
        editor.pteUnsetListItem(listItemStyle)
      } else {
        debug(`Add list item '${listItemStyle}'`)
        editor.pteSetListItem(listItemStyle)
      }
    }

    editor.pteUnsetListItem = (listItemStyle: string) => {
      if (!editor.selection) {
        return
      }
      const selectedBlocks = [
        ...Editor.nodes(editor, {
          at: editor.selection,
          match: (node) =>
            Element.isElement(node) && node._type === types.block.name,
        }),
      ]
      selectedBlocks.forEach(([node, path]) => {
        if (editor.isListBlock(node)) {
          const {listItem, level, ...rest} = node
          const newNode = {
            ...rest,
            listItem: undefined,
            level: undefined,
          } as Partial<Node>
          debug(`Unsetting list '${listItemStyle}'`)
          Transforms.setNodes(editor, newNode, {at: path})
        }
      })
    }

    editor.pteSetListItem = (listItemStyle: string) => {
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
        debug(`Setting list '${listItemStyle}'`)
        Transforms.setNodes(
          editor,
          {
            ...node,
            level: 1,
            listItem: listItemStyle || (types.lists[0] && types.lists[0].value),
          } as Partial<Node>,
          {at: path},
        )
      })
    }

    editor.pteEndList = () => {
      if (!editor.selection) {
        return false
      }
      const selectedBlocks = [
        ...Editor.nodes(editor, {
          at: editor.selection,
          match: (node) =>
            Element.isElement(node) &&
            editor.isListBlock(node) &&
            node.children.length === 1 &&
            Text.isText(node.children[0]) &&
            node.children[0].text === '',
        }),
      ]
      if (selectedBlocks.length === 0) {
        return false
      }
      selectedBlocks.forEach(([node, path]) => {
        if (Element.isElement(node)) {
          debug('Unset list')
          Transforms.setNodes(
            editor,
            {
              ...node,
              level: undefined,
              listItem: undefined,
            },
            {at: path},
          )
        }
      })
      return true // Note: we are exiting the plugin chain by not returning editor (or hotkey plugin 'enter' will fire)
    }

    editor.pteHasListStyle = (listStyle: string): boolean => {
      if (!editor.selection) {
        return false
      }
      const selectedBlocks = [
        ...Editor.nodes(editor, {
          at: editor.selection,
          match: (node) => editor.isTextBlock(node),
        }),
      ]

      if (selectedBlocks.length > 0) {
        return selectedBlocks.every(
          ([node]) => editor.isListBlock(node) && node.listItem === listStyle,
        )
      }
      return false
    }

    return editor
  }
}
