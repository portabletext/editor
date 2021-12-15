import {Editor, Transforms, Element, Text} from 'slate'
import {PortableTextBlock, PortableTextFeatures} from '../../types/portableText'
import {PortableTextSlateEditor} from '../../types/editor'
import {debugWithName} from '../../utils/debug'

const debug = debugWithName('plugin:withPortableTextLists')
const MAX_LIST_LEVEL = 10

export function createWithPortableTextLists(portableTextFeatures: PortableTextFeatures) {
  return function withPortableTextLists(editor: PortableTextSlateEditor): PortableTextSlateEditor {
    editor.pteToggleListItem = (listItemStyle: string) => {
      const isActive = editor.pteHasListStyle(listItemStyle)
      if (isActive) {
        debug(`Remove list item '${listItemStyle}'`)
        editor.pteUnsetListItem(listItemStyle)
      } else {
        debug(`Add list item '${listItemStyle}'`)
        editor.pteSetListItem(listItemStyle)
      }
      const newSelection = toPortableTextRange(editor)
      if (newSelection !== undefined) {
        // Emit a new selection here (though it might be the same).
        // This is for toolbars etc that listens to selection changes to update themselves.
        change$.next({type: 'selection', selection: newSelection})
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
            Element.isElement(node) && node._type === portableTextFeatures.types.block.name,
        }),
      ]
      selectedBlocks.forEach(([node, path]) => {
        const {listItem, level, ...rest} = node
        debug(`Unsetting list '${listItemStyle}'`)
        Transforms.setNodes(editor, {...rest, listItem: undefined, level: undefined}, {at: path})
      })
      // Emit a new selection here (though it might be the same).
      // This is for toolbars etc that listens to selection changes to update themselves.
      change$.next({type: 'selection', selection: toPortableTextRange(editor)})
      editor.onChange()
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
            listItem:
              listItemStyle ||
              (portableTextFeatures.lists[0] && portableTextFeatures.lists[0].value),
          } as PortableTextBlock,
          {at: path}
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
        debug('Unset list')
        Transforms.setNodes(editor, {...node, level: undefined, listItem: undefined}, {at: path})
      })
      change$.next({type: 'selection', selection: toPortableTextRange(editor)})
      return true // Note: we are exiting the plugin chain by not returning editor (or hotkey plugin 'enter' will fire)
    }

    editor.pteIncrementBlockLevels = (reverse?: boolean): boolean => {
      if (!editor.selection) {
        return false
      }
      const selectedBlocks = [
        ...Editor.nodes(editor, {
          at: editor.selection,
          match: (node) => !!editor.isListBlock(node),
        }),
      ]
      if (selectedBlocks.length === 0) {
        return false
      }
      selectedBlocks.forEach(([node, path]) => {
        if (editor.isListBlock(node)) {
          let level = node.level || 1
          if (reverse) {
            level--
            debug('Decrementing list level', Math.min(MAX_LIST_LEVEL, Math.max(1, level)))
          } else {
            level++
            debug('Incrementing list level', Math.min(MAX_LIST_LEVEL, Math.max(1, level)))
          }
          Transforms.setNodes(
            editor,
            {level: Math.min(MAX_LIST_LEVEL, Math.max(1, level))},
            {at: path}
          )
        }
      })
      return true
    }

    editor.pteHasListStyle = (listStyle: string): boolean => {
      if (!editor.selection) {
        return false
      }
      const selectedBlocks = [
        ...Editor.nodes(editor, {
          at: editor.selection,
          match: (node) => editor.isListBlock(node) && node.listItem === listStyle,
        }),
      ]
      if (selectedBlocks.length > 0) {
        return true
      }
      return false
    }

    return editor
  }
}
