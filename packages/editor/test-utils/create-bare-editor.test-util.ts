import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createEditor} from '../src/engine/create-editor'
import {buildIndexMaps} from '../src/internal-utils/build-index-maps'
import {resolveContainers} from '../src/schema/resolve-containers-batch'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

const schema = compileSchema(
  defineSchema({
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    blockObjects: [{name: 'image'}],
    decorators: [{name: 'strong'}, {name: 'em'}],
  }),
)

export function createBareEditor(
  value: Array<PortableTextBlock>,
  keyGenerator: () => string = createTestKeyGenerator('generated-'),
): PortableTextEditorEngine {
  const editor = createEditor() as PortableTextEditorEngine
  const containers = resolveContainers(schema, [])
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps({schema, containers, value}, {blockIndexMap})
  editor.containers = new Map()
  editor.blockIndexMap = blockIndexMap
  editor.verifiedUniqueChildGroups = new Set()
  editor.snapshot = {
    blockIndexMap,
    context: {
      containers,
      converters: [],
      keyGenerator,
      readOnly: false,
      schema,
      selection: null,
      value,
    },
    decoratorState: {},
  }
  return editor
}
