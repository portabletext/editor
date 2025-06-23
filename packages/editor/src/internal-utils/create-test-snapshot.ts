import type {EditorSnapshot} from '..'
import {compileSchemaDefinition, defineSchema} from '../editor/editor-schema'
import {createTestKeyGenerator} from './test-key-generator'

export function createTestSnapshot(snapshot: {
  context?: Partial<EditorSnapshot['context']>
  beta?: Partial<EditorSnapshot['beta']>
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
    beta: {
      activeAnnotations: snapshot.beta?.activeAnnotations ?? [],
      activeDecorators: snapshot.beta?.activeDecorators ?? [],
    },
  }
}
