import {readdirSync, readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, test} from 'vitest'
import {safeParse} from '../internal-utils/safe-json'
import {
  abstractBehaviorEventTypes,
  syntheticBehaviorEventTypes,
} from './behavior.types.event'

/**
 * Every synthetic behavior event must either be exercised by a captured
 * `tests/__fixtures__/wire-catalogue/*.json` scenario or be listed below
 * with a reason. A new event fails until classified; an allowlisted event
 * that a fixture now covers fails until the entry is removed.
 */

type SyntheticEventType =
  | (typeof syntheticBehaviorEventTypes)[number]
  | (typeof abstractBehaviorEventTypes)[number]

const allSyntheticEventTypes: ReadonlyArray<SyntheticEventType> = [
  ...syntheticBehaviorEventTypes,
  ...abstractBehaviorEventTypes,
]

const excludedFromCoverage: Partial<Record<SyntheticEventType, string>> = {
  'move.backward':
    'non-emitting: `applyMove` calls `applySelect`, which only performs `set.selection` operations, no document patches',
  'move.forward':
    'non-emitting: `applyMove` calls `applySelect`, which only performs `set.selection` operations, no document patches',
  'select':
    'non-emitting: `selectOperationImplementation` only calls `applySelect`/`applyDeselect`, never `editor.apply`',
  'select.block': 'non-emitting: resolves to `select`',
  'select.previous block': 'non-emitting: resolves to `select.block`',
  'select.next block': 'non-emitting: resolves to `select.block`',
  'deserialize':
    'non-emitting: pipeline stage, raises `deserialize.data`/`deserialization.failure`',
  'deserialize.data':
    "non-emitting: pipeline stage, raises the converter's output or `deserialization.success`/`.failure`",
  'deserialization.success':
    'non-emitting: raises `insert.blocks`, the mutation happens there',
  'deserialization.failure':
    'non-emitting: raises a follow-up `deserialize.data` attempt or logs a warning',
  'serialize': 'non-emitting: fans out to `serialize.data` per mime type',
  'serialize.data':
    "non-emitting: raises the converter's output onto `serialization.success`/`.failure`",
  'serialization.success':
    'non-emitting: writes to `dataTransfer`, not the document',
  'serialization.failure': 'non-emitting: logs a warning, no document mutation',
  'block.set': 'uncaptured: emitting event without a captured fixture yet',
  'block.unset': 'uncaptured: emitting event without a captured fixture yet',
  'child.set': 'uncaptured: emitting event without a captured fixture yet',
  'child.unset': 'uncaptured: emitting event without a captured fixture yet',
  'history.redo': 'uncaptured: emitting event without a captured fixture yet',
  'history.undo': 'uncaptured: emitting event without a captured fixture yet',
  'insert': 'uncaptured: emitting event without a captured fixture yet',
  'insert.block': 'uncaptured: emitting event without a captured fixture yet',
  'insert.child': 'uncaptured: emitting event without a captured fixture yet',
  'remove.text': 'uncaptured: emitting event without a captured fixture yet',
  'set': 'uncaptured: emitting event without a captured fixture yet',
  'unset': 'uncaptured: emitting event without a captured fixture yet',
  'annotation.set': 'uncaptured: emitting event without a captured fixture yet',
  'annotation.toggle':
    'uncaptured: emitting event without a captured fixture yet',
  'decorator.toggle':
    'uncaptured: emitting event without a captured fixture yet',
  'delete.block': 'uncaptured: emitting event without a captured fixture yet',
  'delete.child': 'uncaptured: emitting event without a captured fixture yet',
  'delete.text': 'uncaptured: emitting event without a captured fixture yet',
  'insert.inline object':
    'uncaptured: emitting event without a captured fixture yet',
  'insert.soft break':
    'uncaptured: emitting event without a captured fixture yet',
  'insert.span': 'uncaptured: emitting event without a captured fixture yet',
  'list item.add': 'uncaptured: emitting event without a captured fixture yet',
  'list item.remove':
    'uncaptured: emitting event without a captured fixture yet',
  'list item.toggle':
    'uncaptured: emitting event without a captured fixture yet',
  'move.block': 'uncaptured: emitting event without a captured fixture yet',
  'move.block up': 'uncaptured: emitting event without a captured fixture yet',
  'split': 'uncaptured: emitting event without a captured fixture yet',
  'style.add': 'uncaptured: emitting event without a captured fixture yet',
  'style.remove': 'uncaptured: emitting event without a captured fixture yet',
  'style.toggle': 'uncaptured: emitting event without a captured fixture yet',
}

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../tests/__fixtures__/wire-catalogue',
)

function extractActionEventType(action: unknown): string | undefined {
  if (typeof action === 'string') {
    // Only `send {...}` actions execute; a `type:` inside a `select {...}`
    // caret description (or any other prose) never reaches the machine, so
    // it must not contribute to coverage.
    if (!action.trimStart().startsWith('send')) {
      return undefined
    }

    return action.match(/type\s*:\s*['"]([^'"]+)['"]/)?.[1]
  }

  if (typeof action === 'object' && action !== null && 'type' in action) {
    return String((action as {type: unknown}).type)
  }

  return undefined
}

// Fixtures known to legitimately extract zero event types (e.g. a fixture
// whose only action is a bare `select`). Empty today: every captured
// fixture sends at least one event.
const fixturesWithoutExtractedEventTypes: ReadonlyArray<string> = []

const referencedEventTypes = new Set<string>()
const fixtureFilesMissingEventTypes: Array<string> = []

for (const file of readdirSync(fixturesDir)) {
  if (!file.endsWith('.json')) {
    continue
  }

  const fixture = safeParse(readFileSync(join(fixturesDir, file), 'utf8')) as {
    actions: Array<unknown>
  }

  let extractedFromFixture = 0

  for (const action of fixture.actions) {
    const eventType = extractActionEventType(action)

    if (eventType !== undefined) {
      referencedEventTypes.add(eventType)
      extractedFromFixture++
    }
  }

  if (extractedFromFixture === 0) {
    fixtureFilesMissingEventTypes.push(file)
  }
}

// `select` only positions the caret; it never emits, so it does not count as
// coverage for the `select` union member.
const derivedCoveredEventTypes = new Set(
  [...referencedEventTypes].filter((eventType) => eventType !== 'select'),
)

describe('wire catalogue coverage', () => {
  test('every synthetic event is covered or classified', () => {
    const unclassified = allSyntheticEventTypes
      .filter(
        (eventType) =>
          !derivedCoveredEventTypes.has(eventType) &&
          !(eventType in excludedFromCoverage),
      )
      .sort()

    expect(unclassified).toEqual([])
  })

  test('no allowlisted event is covered by a fixture', () => {
    const staleExclusions = Object.keys(excludedFromCoverage)
      .filter((eventType) => derivedCoveredEventTypes.has(eventType))
      .sort()

    expect(staleExclusions).toEqual([])
  })

  test('every fixture yields at least one extracted event type', () => {
    const unexpectedlyEmpty = fixtureFilesMissingEventTypes
      .filter((file) => !fixturesWithoutExtractedEventTypes.includes(file))
      .sort()

    expect(unexpectedlyEmpty).toEqual([])
  })

  test('every event type referenced by a fixture exists in the union', () => {
    const allEventTypes = new Set<string>(allSyntheticEventTypes)
    const unknownReferencedTypes = [...referencedEventTypes]
      .filter((eventType) => !allEventTypes.has(eventType))
      .sort()

    expect(unknownReferencedTypes).toEqual([])
  })
})
