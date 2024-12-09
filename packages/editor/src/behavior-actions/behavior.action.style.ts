import {Editor, Transforms} from 'slate'
import type {BehaviorActionImplementation} from './behavior.actions'
import {createGuards} from './behavior.guards'

export const toggleStyleActionImplementation: BehaviorActionImplementation<
  'style.toggle'
> = ({context, action}) => {
  const isActive = isStyleActive({
    editor: action.editor,
    style: action.style,
  })

  if (isActive) {
    removeStyleActionImplementation({
      context,
      action: {...action, type: 'style.remove'},
    })
  } else {
    addStyleActionImplementation({
      context,
      action: {...action, type: 'style.add'},
    })
  }
}

export const removeStyleActionImplementation: BehaviorActionImplementation<
  'style.remove'
> = ({context, action}) => {
  if (!action.editor.selection) {
    return
  }

  const defaultStyle = context.schema.styles[0].value
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
        style: defaultStyle,
      },
      {
        at,
      },
    )
  }
}

export const addStyleActionImplementation: BehaviorActionImplementation<
  'style.add'
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
        style: action.style,
      },
      {
        at,
      },
    )
  }
}

export function isStyleActive({
  editor,
  style,
}: {
  editor: Editor
  style: string
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
    return selectedBlocks.every(([node]) => node.style === style)
  }

  return false
}
