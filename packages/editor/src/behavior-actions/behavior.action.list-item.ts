import {Editor, Transforms} from 'slate'
import type {BehaviorActionImplementation} from './behavior.actions'
import {createGuards} from './behavior.guards'

export const toggleListItemActionImplementation: BehaviorActionImplementation<
  'list item.toggle'
> = ({context, action}) => {
  const isActive = isListItemActive({
    editor: action.editor,
    listItem: action.listItem,
  })

  if (isActive) {
    removeListItemActionImplementation({
      context,
      action: {...action, type: 'list item.remove'},
    })
  } else {
    addListItemActionImplementation({
      context,
      action: {...action, type: 'list item.add'},
    })
  }
}

export const removeListItemActionImplementation: BehaviorActionImplementation<
  'list item.remove'
> = ({context, action}) => {
  if (!action.editor.selection) {
    return
  }

  const guards = createGuards(context)

  const selectedBlocks = [
    ...Editor.nodes(action.editor, {
      at: action.editor.selection,
      match: (node) => guards.isListBlock(node),
    }),
  ]

  for (const [, at] of selectedBlocks) {
    Transforms.unsetNodes(action.editor, ['listItem', 'level'], {at})
  }
}

export const addListItemActionImplementation: BehaviorActionImplementation<
  'list item.add'
> = ({context, action}) => {
  if (!action.editor.selection) {
    return
  }

  const guards = createGuards(context)

  const selectedBlocks = [
    ...Editor.nodes(action.editor, {
      at: action.editor.selection,
      match: (node) => guards.isTextBlock(node),
    }),
  ]

  for (const [, at] of selectedBlocks) {
    Transforms.setNodes(
      action.editor,
      {
        level: 1,
        listItem: action.listItem,
      },
      {at},
    )
  }
}

export function isListItemActive({
  editor,
  listItem,
}: {
  editor: Editor
  listItem: string
}): boolean {
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
      ([node]) => editor.isListBlock(node) && node.listItem === listItem,
    )
  }

  return false
}
