import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {InternalBlockPathMap} from './block-path-map'

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
  const blockPathMap = new InternalBlockPathMap()

  snapshot.context?.value?.forEach((block, index) => {
    blockIndexMap.set(block._key, index)
  })

  blockPathMap.rebuild(context.value, context.schema)

  return {
    blockIndexMap,
    blockPathMap,
    context,
    decoratorState: snapshot?.decoratorState ?? {},
  }
}
