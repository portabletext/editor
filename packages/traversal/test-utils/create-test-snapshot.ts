// Keep in sync with `packages/editor/test-utils/create-test-snapshot.ts`.
import {compileSchema, defineSchema} from '@portabletext/schema'
import {buildIndexMaps} from '../src/build-index-maps'
import type {TraversalSnapshot} from '../src/traversal-snapshot'

export function createTestSnapshot(snapshot: {
  context?: Partial<TraversalSnapshot['context']>
}): TraversalSnapshot {
  const context = {
    containers: snapshot.context?.containers ?? new Map(),
    schema: snapshot.context?.schema ?? compileSchema(defineSchema({})),
    value: snapshot.context?.value ?? [],
  }
  const indexMap = new Map<string, number>()
  buildIndexMaps(
    {
      schema: context.schema,
      value: context.value,
      containers: context.containers,
    },
    {indexMap},
  )

  return {
    indexMap,
    context,
  }
}
