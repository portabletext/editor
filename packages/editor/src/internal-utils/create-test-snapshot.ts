import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {buildBlockMap, type BlockMap} from './block-map'

export function createTestSnapshot(snapshot: {
  context?: Partial<EditorSnapshot['context']>
  decoratorState?: Partial<EditorSnapshot['decoratorState']>
}): EditorSnapshot {
  const context = {
    converters: snapshot.context?.converters ?? [],
    schema: snapshot.context?.schema ?? compileSchema(defineSchema({})),
    keyGenerator: snapshot.context?.keyGenerator ?? createTestKeyGenerator(),
    readOnly: snapshot.context?.readOnly ?? false,
    value: snapshot.context?.value ?? [],
    selection: snapshot.context?.selection ?? null,
  }
  const blockIndexMap = new Map<string, number>()
  const blockMap: BlockMap = new Map()

  snapshot.context?.value?.forEach((block, index) => {
    blockIndexMap.set(block._key, index)
  })

  buildBlockMap({value: context.value}, blockMap)

  return {
    blockMap,
    blockIndexMap,
    context,
    decoratorState: snapshot?.decoratorState ?? {},
  }
}
