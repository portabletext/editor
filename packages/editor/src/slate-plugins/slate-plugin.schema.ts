import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import {applySetNode} from '../internal-utils/apply-set-node'
import {debug} from '../internal-utils/debug'
import {isEditor} from '../slate/editor/is-editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {withNormalizeNode} from './slate-plugin.normalize-node'

/**
 * This plugin makes sure that schema types are recognized properly by Slate as blocks, voids, inlines
 *
 */
export function createSchemaPlugin({editorActor}: {editorActor: EditorActor}) {
  return function schemaPlugin(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    editor.schema = editorActor.getSnapshot().context.schema
    editor.isInline = (
      element: PortableTextTextBlock | PortableTextObject,
    ): boolean => {
      if (isEditor(element)) {
        return false
      }

      const snapshot = editorActor.getSnapshot()
      const isInlineType = snapshot.context.schema.inlineObjects
        .map((obj) => obj.name)
        .includes(element._type)

      if (!isInlineType) {
        return false
      }

      // Dual-registered types use position to determine inline status.
      const isAlsoBlockType = snapshot.context.schema.blockObjects
        .map((obj) => obj.name)
        .includes(element._type)

      if (isAlsoBlockType) {
        for (const child of editor.children) {
          if (child === element) {
            return false
          }
        }
      }

      return true
    }

    // Extend Slate's default normalization
    const {normalizeNode} = editor
    editor.normalizeNode = (entry) => {
      const [node, path] = entry

      if (isEditor(node)) {
        normalizeNode(entry)
        return
      }

      // If text block children node is missing _type, set it to the span type
      if (node._type === undefined && path.length === 2) {
        debug.normalization('Setting span type on text node without a type')
        const span = node as PortableTextSpan
        const key =
          span._key || editorActor.getSnapshot().context.keyGenerator()
        withNormalizeNode(editor, () => {
          applySetNode(
            editor,
            {
              ...span,
              _type: editorActor.getSnapshot().context.schema.span.name,
              _key: key,
            },
            path,
          )
        })
        return
      }

      // catches cases when the children are missing keys but excludes it when the normalize is running the node as the editor object
      if (node._key === undefined && (path.length === 1 || path.length === 2)) {
        debug.normalization('Setting missing key on child node without a key')
        const key = editorActor.getSnapshot().context.keyGenerator()
        withNormalizeNode(editor, () => {
          applySetNode(editor, {_key: key}, path)
        })
        return
      }

      withNormalizeNode(editor, () => {
        normalizeNode(entry)
      })
    }
    return editor
  }
}
