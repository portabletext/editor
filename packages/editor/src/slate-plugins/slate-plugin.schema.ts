import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import type {EditorSchema} from '../editor/editor-schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {debug} from '../internal-utils/debug'
import {resolveChildArrayFieldByType} from '../schema/resolve-child-array-field'
import {isEditor} from '../slate/editor/is-editor'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {withNormalizeNode} from './slate-plugin.normalize-node'

/**
 * This plugin makes sure that schema types are recognized properly by Slate as blocks, object nodes, inlines
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

      // Container normalization: ensure child array fields are populated.
      // Builds the full minimum structure in one pass since Slate's
      // normalization loop does not traverse container child fields.
      if (isObjectNode({schema: editor.schema}, node)) {
        const normalization = findContainerNormalization(
          editor.schema,
          node,
          path,
          editorActor.getSnapshot().context.keyGenerator,
        )
        if (normalization) {
          debug.normalization(normalization.message)
          withNormalizeNode(editor, () => {
            editor.apply({
              type: 'insert_node',
              path: normalization.insertPath,
              node: normalization.node,
            })
          })
          return
        }
      }

      withNormalizeNode(editor, () => {
        normalizeNode(entry)
      })
    }
    return editor
  }
}

/**
 * Finds the first container normalization needed for a node and its
 * descendants. Returns the insert path and node to insert, or undefined
 * if no normalization is needed.
 *
 * Walks into existing container children since Slate's normalization
 * loop does not traverse container child fields.
 */
function findContainerNormalization(
  schema: EditorSchema,
  node: PortableTextObject,
  nodePath: number[],
  keyGenerator: () => string,
): {insertPath: number[]; node: Node; message: string} | undefined {
  const childField = resolveChildArrayFieldByType(schema, node._type)
  if (!childField) {
    return undefined
  }

  const nodeRecord = node as Record<string, unknown>
  const children = nodeRecord[childField.name]

  // Missing or empty child array: insert a minimum valid child
  if (!Array.isArray(children) || children.length === 0) {
    const firstOfType = childField.of.at(0)
    if (!firstOfType) {
      return undefined
    }

    const newChild = buildMinimumChild(schema, firstOfType.type, keyGenerator)
    if (!newChild) {
      return undefined
    }

    return {
      insertPath: [...nodePath, 0],
      node: newChild,
      message: `Adding missing ${firstOfType.type} to empty ${childField.name} field on ${node._type}`,
    }
  }

  // Children exist: recursively check each child for missing structure
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    if (
      child &&
      typeof child === 'object' &&
      '_type' in child &&
      typeof child._type === 'string' &&
      '_key' in child &&
      typeof child._key === 'string'
    ) {
      const result = findContainerNormalization(
        schema,
        child as PortableTextObject,
        [...nodePath, index],
        keyGenerator,
      )
      if (result) {
        return result
      }
    }
  }

  return undefined
}

/**
 * Recursively builds the minimum valid child node for a given type.
 * For text blocks, creates a full block with a span.
 * For container types, creates the node with its minimum child structure
 * populated from the schema.
 */
function buildMinimumChild(
  schema: EditorSchema,
  nodeType: string,
  keyGenerator: () => string,
): Node | undefined {
  if (nodeType === schema.block.name) {
    const defaultStyle = schema.styles.at(0)?.value ?? 'normal'
    return {
      _key: keyGenerator(),
      _type: schema.block.name,
      children: [
        {
          _key: keyGenerator(),
          _type: schema.span.name,
          text: '',
          marks: [],
        },
      ],
      markDefs: [],
      style: defaultStyle,
    }
  }

  const childField = resolveChildArrayFieldByType(schema, nodeType)
  if (!childField) {
    return {
      _key: keyGenerator(),
      _type: nodeType,
    }
  }

  const firstOfType = childField.of.at(0)
  if (!firstOfType) {
    return {
      _key: keyGenerator(),
      _type: nodeType,
    }
  }

  const grandchild = buildMinimumChild(schema, firstOfType.type, keyGenerator)
  if (!grandchild) {
    return {
      _key: keyGenerator(),
      _type: nodeType,
    }
  }

  return {
    _key: keyGenerator(),
    _type: nodeType,
    [childField.name]: [grandchild],
  }
}
