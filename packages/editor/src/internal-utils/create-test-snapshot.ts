import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {EditorSnapshot} from '../editor/editor-snapshot'

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

  return {
    context,
    decoratorState: snapshot?.decoratorState ?? {},
  }
}
