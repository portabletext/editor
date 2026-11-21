import {compileSchema, defineSchema} from '@portabletext/schema'
import {buildIndexMaps} from '../src/internal-utils/build-index-maps'
import type {TraversalSnapshot} from '../src/traversal/traversal-snapshot'

export function createTestSnapshot(snapshot: {
  context?: Partial<TraversalSnapshot['context']>
}) {
  const context = {
    containers: snapshot.context?.containers ?? new Map(),
    schema: snapshot.context?.schema ?? compileSchema(defineSchema({})),
    value: snapshot.context?.value ?? [],
  }
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps(context, {blockIndexMap})
  return {context, blockIndexMap}
}
