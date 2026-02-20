import {
  isSpan,
  isTextBlock,
  type PortableTextListBlock,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import {debug} from '../internal-utils/debug'
import {Editor, Transforms, type Element, type Node} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isListBlock} from '../utils/parse-blocks'
import {withNormalizeNode} from './slate-plugin.normalize-node'

/**
 * This plugin makes sure that schema types are recognized properly by Slate as blocks, voids, inlines
 *
 */
export function createSchemaPlugin({editorActor}: {editorActor: EditorActor}) {
  return function schemaPlugin(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    editor.createTextNode = () =>
      ({
        _type: editorActor.getSnapshot().context.schema.span.name,
        _key: editorActor.getSnapshot().context.keyGenerator(),
        text: '',
        marks: [],
      }) as unknown as Node
    editor.isText = (value: any): value is import('../slate').Text => {
      if (!value || typeof value !== 'object') {
        return false
      }
      const spanName = editorActor.getSnapshot().context.schema.span.name
      return typeof value.text === 'string' && value._type === spanName
    }
    editor.isElement = (value: any): value is Element => {
      if (!value || typeof value !== 'object') {
        return false
      }
      if (typeof value.apply === 'function') {
        return false
      }
      return typeof value._type === 'string' && !editor.isText(value)
    }
    editor.isTextBlock = (value: unknown): value is PortableTextTextBlock => {
      if (Editor.isEditor(value)) {
        return false
      }

      return isTextBlock(editorActor.getSnapshot().context, value)
    }
    editor.isTextSpan = (value: unknown): value is PortableTextSpan => {
      if (Editor.isEditor(value)) {
        return false
      }

      return isSpan(editorActor.getSnapshot().context, value)
    }
    editor.isListBlock = (value: unknown): value is PortableTextListBlock => {
      if (Editor.isEditor(value)) {
        return false
      }

      return isListBlock(editorActor.getSnapshot().context, value)
    }
    editor.isVoid = (element: Element): boolean => {
      if (Editor.isEditor(element)) {
        return false
      }

      return (
        editorActor.getSnapshot().context.schema.block.name !== element._type &&
        (editorActor
          .getSnapshot()
          .context.schema.blockObjects.map((obj) => obj.name)
          .includes(element._type) ||
          editorActor
            .getSnapshot()
            .context.schema.inlineObjects.map((obj) => obj.name)
            .includes(element._type))
      )
    }
    editor.isInline = (element: Element): boolean => {
      if (Editor.isEditor(element)) {
        return false
      }

      const inlineSchemaTypes = editorActor
        .getSnapshot()
        .context.schema.inlineObjects.map((obj) => obj.name)
      return (
        inlineSchemaTypes.includes(element._type) &&
        '__inline' in element &&
        element.__inline === true
      )
    }

    // Extend Slate's default normalization
    const {normalizeNode} = editor
    editor.normalizeNode = (entry) => {
      const [node, path] = entry

      // If text block children node is missing _type, set it to the span type
      if (node._type === undefined && path.length === 2) {
        debug.normalization('Setting span type on text node without a type')
        const span = node as PortableTextSpan
        const key =
          span._key || editorActor.getSnapshot().context.keyGenerator()
        withNormalizeNode(editor, () => {
          Transforms.setNodes(
            editor,
            {
              ...span,
              _type: editorActor.getSnapshot().context.schema.span.name,
              _key: key,
            },
            {at: path},
          )
        })
        return
      }

      // catches cases when the children are missing keys but excludes it when the normalize is running the node as the editor object
      if (node._key === undefined && (path.length === 1 || path.length === 2)) {
        debug.normalization('Setting missing key on child node without a key')
        const key = editorActor.getSnapshot().context.keyGenerator()
        withNormalizeNode(editor, () => {
          Transforms.setNodes(editor, {_key: key}, {at: path})
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
