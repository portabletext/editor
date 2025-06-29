import type {EditorSnapshot} from '..'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import {createTestKeyGenerator} from './test-key-generator'

export function createTestSnapshot(snapshot: {
  context?: Partial<EditorSnapshot['context']>
  decoratorState?: Partial<EditorSnapshot['decoratorState']>
}): EditorSnapshot {
  const context = {
    converters: snapshot.context?.converters ?? [],
    schema:
      snapshot.context?.schema ?? compileSchemaDefinition(defineSchema({})),
    keyGenerator: snapshot.context?.keyGenerator ?? createTestKeyGenerator(),
    readOnly: snapshot.context?.readOnly ?? false,
    value: snapshot.context?.value ?? [],
    selection: snapshot.context?.selection ?? null,
  }
  const blockIndexMap = new Map<string, number>()

  snapshot.context?.value?.forEach((block, index) => {
    blockIndexMap.set(block._key, index)
  })

  return {
    blockIndexMap,
    context,
    decoratorState: snapshot?.decoratorState ?? {},
  }
}
