import {compileSchema, isTypedObject} from '@portabletext/schema'
import {toTextspec} from '@portabletext/test'
import {After, Before, Given, Then, When} from 'racejar'
import {runOnDevice} from 'thumbjar'
import type {Run, Step} from 'thumbjar'
import {afterAll, expect} from 'vitest'
import type {TestContext} from 'vitest'
import {safeStringify} from '../../src/internal-utils/safe-json.ts'
import {gherkinSchemaDefinition} from '../../src/test/gherkin-schema.ts'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../../test-utils/text-selection.ts'

type Assertion = {
  boundary: number
  text: string
  expected: string
  kind: 'state' | 'before' | 'after'
}
type Collection = {
  steps: Step[]
  assertions: Assertion[]
  unsupported: string[]
}
type Context = TestContext & {collection: Collection}

type KnownDifference = {scenario: string; boundary: number; actual: string}

export function deviceDefinitions(
  run: typeof runOnDevice = runOnDevice,
  differences: KnownDifference[] = [],
) {
  const unexpected: unknown[] = []
  if (differences.length) {
    afterAll(() => {
      if (unexpected.length) {
        throw new AggregateError(
          unexpected,
          'Unexpected device boundary failures',
        )
      }
    })
  }
  return {
    hooks: [
      Before((context: Context) => {
        context.collection = {steps: [], assertions: [], unsupported: []}
      }),
      After(async (context: Context) => {
        if (context.task.result?.state === 'fail') {
          return
        }
        if (context.collection.unsupported.length) {
          context.skip(
            `Not drivable: ${context.collection.unsupported.join('; ')}`,
          )
        }
        const result = await run(context, {
          url: 'http://localhost:8765/gherkin.html',
          keyboard: 'en',
          prefix: '',
          steps: context.collection.steps,
        })
        const listed = differences.filter(
          (difference) => difference.scenario === context.task.name,
        )
        if (!listed.length) {
          assertBoundaries(context.collection, result)
          return
        }
        const failures: unknown[] = []
        const invalid = new Set<number>()
        for (
          let boundary = 0;
          boundary < context.collection.steps.length;
          boundary++
        ) {
          try {
            const actual = toDeviceTextspec(result.steps[boundary]?.stateAfter)
            const difference = listed.find(
              (entry) => entry.boundary === boundary + 1,
            )
            if (difference && actual !== difference.actual) {
              unexpected.push(
                new Error(
                  `Boundary ${boundary + 1}: expected recorded state ${safeStringify(difference.actual)}, received ${safeStringify(actual)}`,
                ),
              )
            }
          } catch (error) {
            invalid.add(boundary)
            unexpected.push(
              new Error(`Boundary ${boundary + 1}: ${String(error)}`),
            )
          }
        }
        for (const assertion of context.collection.assertions) {
          if (invalid.has(assertion.boundary)) {
            continue
          }
          try {
            assertBoundaries(
              {...context.collection, assertions: [assertion]},
              result,
            )
          } catch (error) {
            if (
              !listed.some(
                (difference) => difference.boundary === assertion.boundary + 1,
              )
            ) {
              unexpected.push(error)
            }
            failures.push(error)
          }
        }
        if (failures.length || invalid.size) {
          throw new AggregateError(
            failures,
            'Device boundary assertions failed',
          )
        }
      }),
    ],
    stepDefinitions: [
      Given('{}', (context: Context, text: string, doc?: string) =>
        collect(context.collection, 'Context', text, doc),
      ),
      When('{}', (context: Context, text: string, doc?: string) =>
        collect(context.collection, 'Action', text, doc),
      ),
      Then('{}', (context: Context, text: string, doc?: string) =>
        collect(context.collection, 'Outcome', text, doc),
      ),
    ],
  }
}

export function collect(
  collection: Collection,
  type: string,
  text: string,
  doc?: string,
): void {
  const quoted = /^"((?:[^"\\]|\\.)*)" (.*)$/.exec(text)
  const value = quoted?.[1]?.replace(/\\(["\\])/g, '$1')
  const tail = quoted?.[2]
  const state = /^the editor state is(?: "((?:[^"\\]|\\.)*)")?$/.exec(text)
  if (state) {
    const expected = normalize(
      state[1]?.replace(/\\(["\\])/g, '$1') ?? doc ?? '',
    )
    if (type === 'Context') {
      collection.steps.push({type: 'page', action: 'state', args: expected})
    } else {
      collection.assertions.push({
        boundary: collection.steps.length - 1,
        text,
        expected,
        kind: 'state',
      })
    }
    return
  }
  if (type === 'Context' && text === 'one editor') {
    return
  }
  if (text === 'the editor is focused') {
    collection.steps.push({type: 'page', action: 'focus'})
    return
  }
  const caret = /^the caret is (put )?(before|after) "((?:[^"\\]|\\.)*)"$/.exec(
    text,
  )
  if (caret) {
    const expected = caret[3]!.replace(/\\(["\\])/g, '$1')
    const kind = caret[2] === 'before' ? 'before' : 'after'
    if (caret[1]) {
      collection.steps.push({type: 'page', action: kind, args: expected})
    } else {
      collection.assertions.push({
        boundary: collection.steps.length - 1,
        text,
        expected,
        kind,
      })
    }
    return
  }
  const selection = /^the selection is(?: "((?:[^"\\]|\\.)*)")?$/.exec(text)
  if (selection) {
    collection.steps.push({
      type: 'page',
      action: 'selection',
      args: normalize(selection[1]?.replace(/\\(["\\])/g, '$1') ?? doc ?? ''),
    })
    return
  }
  if (
    text === 'everything is selected' ||
    text === 'everything is selected backwards'
  ) {
    collection.steps.push({
      type: 'page',
      action: 'all',
      args: text.endsWith('backwards') ? 'backwards' : 'forwards',
    })
    return
  }
  if (value !== undefined && tail === 'is selected') {
    collection.steps.push({type: 'page', action: 'select', args: value})
    return
  }
  if (value !== undefined && tail === 'is inserted') {
    collection.steps.push({type: 'page', action: 'insert', args: value})
    return
  }
  if (value !== undefined && tail === 'is typed' && /^[a-z -]*$/.test(value)) {
    collection.steps.push({type: 'compose', text: value, commit: 'none'})
    return
  }
  const pressed = /^is pressed(?: (\d+) times)?$/.exec(tail ?? '')
  if (pressed && (value === '{Enter}' || value === '{Backspace}')) {
    const times = Number(pressed[1] ?? 1)
    if (value === '{Backspace}') {
      collection.steps.push({type: 'backspace', times})
    } else {
      for (let press = 0; press < times; press++) {
        collection.steps.push({type: 'enter'})
      }
    }
    return
  }
  if (text === 'undo is performed' || text === 'redo is performed') {
    collection.steps.push({
      type: 'page',
      action: text.startsWith('undo') ? 'undo' : 'redo',
    })
    return
  }
  collection.unsupported.push(text)
}

export function assertBoundaries(collection: Collection, result: Run): void {
  for (const assertion of collection.assertions) {
    const stateAfter = result.steps[assertion.boundary]?.stateAfter
    expect(
      typeof stateAfter,
      `Then ${assertion.text} (boundary ${assertion.boundary + 1}) has no textspec`,
    ).toEqual('object')
    const state = toDeviceTextspec(stateAfter)
    if (assertion.kind === 'state') {
      const actual = /(?<!\\)[|^]/.test(assertion.expected)
        ? state
        : state.replace(/(?<!\\)[|^]/g, '')
      expect(
        actual,
        `Then ${assertion.text} (boundary ${assertion.boundary + 1})`,
      ).toEqual(assertion.expected)
    } else {
      const editorState = parseDeviceState(stateAfter)
      const context = {
        schema: compileSchema(gherkinSchemaDefinition),
        value: editorState.value,
        containers: new Map(),
      }
      const selection =
        assertion.kind === 'before'
          ? getSelectionBeforeText(context, assertion.expected)
          : getSelectionAfterText(context, assertion.expected)
      expect(
        editorState.selection
          ? {
              ...editorState.selection,
              backward: editorState.selection.backward ?? false,
            }
          : null,
        `Then ${assertion.text} (boundary ${assertion.boundary + 1}): ${state}`,
      ).toEqual(selection)
    }
  }
}

function normalize(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/;;/g, '\n')
}

/** Validates `value` as an array of typed objects and each `block`'s `children` as an array of typed objects. Containers remain opaque. */
function parseDeviceState(state: unknown) {
  if (
    !state ||
    typeof state !== 'object' ||
    !('value' in state) ||
    !('selection' in state)
  ) {
    throw new Error('malformed editor state: missing value or selection')
  }
  if (!Array.isArray(state.value) || !state.value.every(isTypedObject)) {
    throw new Error(
      'malformed editor state: value must be an array of typed objects',
    )
  }
  for (const block of state.value) {
    if (block._type === 'block') {
      if (
        !Array.isArray(block.children) ||
        !block.children.every(isTypedObject)
      ) {
        throw new Error(
          'malformed editor state: block children must be an array of typed objects',
        )
      }
    }
  }
  return state as Pick<Parameters<typeof toTextspec>[0], 'value' | 'selection'>
}

export function toDeviceTextspec(state: unknown): string {
  const editorState = parseDeviceState(state)
  return toTextspec({
    schema: compileSchema(gherkinSchemaDefinition),
    ...editorState,
  })
}
