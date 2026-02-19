import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {debug} from '../internal-utils/debug'
import {Element} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

export function updateValuePlugin(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  editor: PortableTextSlateEditor,
) {
  const {apply} = editor

  editor.apply = (operation) => {
    if (editor.isNormalizingNode) {
      debug.normalization(
        `(slate operation)\n${JSON.stringify(operation, null, 2)}`,
      )
    }

    if (operation.type === 'set_selection') {
      apply(operation)
      return
    }

    // Slate's normalization creates bare text nodes ({text: ''}) without
    // marks or _type. Promote them to proper spans before they enter the
    // tree. This catches all insert_node operations regardless of source
    // (Transforms.insertNodes, editor.insertNodes, normalization).
    if (operation.type === 'insert_node') {
      const record = operation.node as Record<string, unknown>
      if (
        typeof record['text'] === 'string' &&
        !Element.isElement(operation.node)
      ) {
        const needsType = typeof record['_type'] !== 'string'
        const needsMarks = !Array.isArray(record['marks'])

        if (needsType || needsMarks) {
          operation = {
            ...operation,
            node: {
              ...record,
              _type: needsType ? context.schema.span.name : record['_type'],
              marks: needsMarks ? [] : record['marks'],
            } as unknown as typeof operation.node,
          }
        }
      }
    }

    // Apply the Slate operation first, then derive the PT value from
    // editor.children. With childless void elements, the Slate tree and
    // PT tree are structurally identical.
    apply(operation)

    editor.value = editor.children as Array<PortableTextBlock>

    if (operation.type === 'insert_text' || operation.type === 'remove_text') {
      // Inserting and removing text has no effect on index maps so there is
      // no need to rebuild those.
      return
    }

    buildIndexMaps(
      {
        schema: context.schema,
        value: editor.value,
      },
      {
        blockIndexMap: editor.blockIndexMap,
        listIndexMap: editor.listIndexMap,
      },
    )
  }

  return editor
}
