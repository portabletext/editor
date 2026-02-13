import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {BlockPath} from '../types/paths'

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
  const blockIndexMap = new Map<string, {path: BlockPath; index: number}>()

  snapshot.context?.value?.forEach((block, index) => {
    blockIndexMap.set(block._key, {path: [{_key: block._key}], index})
  })

  return {
    blockIndexMap,
    context,
    decoratorState: snapshot?.decoratorState ?? {},
  }
}
