import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {EditorSnapshot} from '../src/editor/editor-snapshot'
import {buildIndexMaps} from '../src/internal-utils/build-index-maps'

export function createTestSnapshot(snapshot: {
  context?: Partial<EditorSnapshot['context']>
  decoratorState?: Partial<EditorSnapshot['decoratorState']>
}): EditorSnapshot {
  const context = {
    containers: snapshot.context?.containers ?? new Map(),
    converters: snapshot.context?.converters ?? [],
    schema: snapshot.context?.schema ?? compileSchema(defineSchema({})),
    keyGenerator: snapshot.context?.keyGenerator ?? createTestKeyGenerator(),
    readOnly: snapshot.context?.readOnly ?? false,
    value: snapshot.context?.value ?? [],
    selection: snapshot.context?.selection ?? null,
  }
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps(
    {
      schema: context.schema,
      value: context.value,
      containers: context.containers,
    },
    {blockIndexMap, listIndexMap: new Map<string, number>()},
  )

  return {
    blockIndexMap,
    context,
    decoratorState: snapshot?.decoratorState ?? {},
  }
}
