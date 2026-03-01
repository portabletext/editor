import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getFocusBlock} from '@portabletext/editor/selectors'
import {isSelectionCollapsed} from '@portabletext/editor/utils'
import {useEffect} from 'react'

const listPrefixPattern = /^(\s*[-*+]\s)$/
const orderedListPrefixPattern = /^(\s*\d+\.\s)$/

const dissolveListOnEnter = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    if (
      !snapshot.context.selection ||
      !isSelectionCollapsed(snapshot.context.selection)
    ) {
      return false
    }

    const focusBlock = getFocusBlock(snapshot)
    if (!focusBlock) {
      return false
    }

    // Get the full text of the block
    const node = focusBlock.node
    if (!('children' in node) || !Array.isArray(node.children)) {
      return false
    }
    const text = node.children
      .filter(
        (child: unknown): child is {text: string} =>
          child !== null &&
          typeof child === 'object' &&
          'text' in child &&
          typeof child.text === 'string',
      )
      .map((child) => child.text)
      .join('')

    // Check if the entire block text is just a list prefix
    if (listPrefixPattern.test(text) || orderedListPrefixPattern.test(text)) {
      // Use the current selection's path to construct a range covering the prefix
      const slatePath = snapshot.context.selection.focus.path
      return {
        deleteAt: {
          anchor: {path: slatePath, offset: 0},
          focus: {path: slatePath, offset: text.length},
        },
      }
    }

    return false
  },
  actions: [(_, {deleteAt}) => [raise({type: 'delete', at: deleteAt})]],
})

export function MarkdownEditorPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const unregister = editor.registerBehavior({
      behavior: dissolveListOnEnter,
    })

    return unregister
  }, [editor])

  return null
}
