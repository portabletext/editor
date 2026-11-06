import type {Patch} from '@portabletext/patches'
import {interpretTransaction, mapRange} from '@portabletext/steps'
import type {Change} from '../engine/core/change'
import type {Range} from '../engine/interfaces/range'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {operationToPatches} from '../internal-utils/operation-to-patches'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export type DecorationMappingDebugCapture = {
  cause: Change['cause']['type']
  entryOrigins: Array<Change['entries'][number]['event']['origin']>
  beforeValue: Change['entries'][number]['event']['beforeValue']
  entryPatches: Array<Array<Patch>>
  derivedPatches: Array<Patch>
  steps: ReturnType<typeof interpretTransaction>
  range: Range
  mappedRange: Range | null
}

let decorationMappingDebugHook:
  | ((capture: DecorationMappingDebugCapture) => void)
  | undefined

export function setDecorationMappingDebugHook(
  hook: ((capture: DecorationMappingDebugCapture) => void) | undefined,
): void {
  decorationMappingDebugHook = hook
}

export function mapDecorationRangesThroughChange(
  editorEngine: PortableTextEditorEngine,
  change: Change,
): (range: Range) => Range | null {
  const base = change.entries[0]?.event.beforeValue ?? []
  const patches = changeToPatches(editorEngine, change)
  const steps = interpretTransaction(base, patches)

  return (range) => {
    const mappedRange = mapRange(steps, range)

    decorationMappingDebugHook?.({
      cause: change.cause.type,
      entryOrigins: change.entries.map((entry) => entry.event.origin),
      beforeValue: base,
      entryPatches: change.entries.map((entry) => entry.patches),
      derivedPatches: patches,
      steps,
      range,
      mappedRange,
    })

    return mappedRange
  }
}

export function changeToPatches(
  editorEngine: PortableTextEditorEngine,
  change: Change,
): Array<Patch> {
  const patches: Array<Patch> = []

  for (let index = 0; index < change.entries.length; index++) {
    const entry = change.entries[index]!
    const afterValue =
      change.entries[index + 1]?.event.beforeValue ??
      editorEngine.snapshot.context.value
    const blockIndexMap = new Map<string, number>()
    buildIndexMaps(
      {
        schema: editorEngine.snapshot.context.schema,
        containers: editorEngine.snapshot.context.containers,
        value: afterValue,
      },
      {blockIndexMap},
    )
    patches.push(
      ...operationToPatches(entry.event.operation, {
        beforeValue: entry.event.beforeValue,
        afterSnapshot: {
          context: {
            schema: editorEngine.snapshot.context.schema,
            containers: editorEngine.snapshot.context.containers,
            value: afterValue,
          },
          blockIndexMap,
        },
      }),
    )
  }

  return patches
}
