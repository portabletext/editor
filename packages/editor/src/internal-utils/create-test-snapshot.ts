import type {EditorSnapshot} from '..'
import {compileSchemaDefinition, defineSchema} from '../editor/define-schema'
import {createTestKeyGenerator} from './test-key-generator'

export function createTestSnapshot(snapshot: {
  context?: Partial<EditorSnapshot['context']>
  beta?: Partial<EditorSnapshot['beta']>
}): EditorSnapshot {
  return {
    context: {
      converters: snapshot.context?.converters ?? [],
      schema:
        snapshot.context?.schema ?? compileSchemaDefinition(defineSchema({})),
      keyGenerator: snapshot.context?.keyGenerator ?? createTestKeyGenerator(),
      activeDecorators: snapshot.context?.activeDecorators ?? [],
      readOnly: snapshot.context?.readOnly ?? false,
      value: snapshot.context?.value ?? [],
      selection: snapshot.context?.selection ?? null,
    },
    beta: {
      hasTag: snapshot.beta?.hasTag ?? (() => false),
      internalDrag: undefined,
    },
  }
}
