import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {
  getFocusTextBlock,
  isSelectionCollapsed,
} from '@portabletext/editor/selectors'
import {isEmptyTextBlock} from '@portabletext/editor/utils'
import {useEffect} from 'react'

/**
 * Pressing Enter on an empty heading converts it to a paragraph instead of
 * inserting a new heading line. Mirrors the "Enter exits a heading" behavior
 * common to markdown-first editors.
 */
const enterOnEmptyHeadingResetsStyle = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusTextBlock = getFocusTextBlock(snapshot)

    if (!focusTextBlock) {
      return false
    }
    if (!isSelectionCollapsed(snapshot)) {
      return false
    }
    if (
      focusTextBlock.node.style === undefined ||
      focusTextBlock.node.style === 'normal'
    ) {
      return false
    }
    if (!isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
      return false
    }

    return {focusTextBlock}
  },
  actions: [
    (_, {focusTextBlock}) => [
      raise({
        type: 'block.unset',
        props: ['style'],
        at: focusTextBlock.path,
      }),
    ],
  ],
})

/**
 * Hosts custom behaviors specific to the markdown-editor example app.
 *
 * Render this as a child of `EditorProvider`.
 */
export function MarkdownEditorBehaviorsPlugin() {
  const editor = useEditor()

  useEffect(() => {
    return editor.registerBehavior({
      behavior: enterOnEmptyHeadingResetsStyle,
    })
  }, [editor])

  return null
}
