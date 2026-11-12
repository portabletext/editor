import {After, Before, Given, Then, When} from 'racejar'
import {runOnDevice} from 'thumbjar'
import type {Run, Step} from 'thumbjar'
import {expect} from 'vitest'
import type {TestContext} from 'vitest'

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

export function deviceDefinitions(run: typeof runOnDevice = runOnDevice) {
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
        assertBoundaries(context.collection, result)
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
    const state = result.steps[assertion.boundary]?.stateAfter
    expect(
      typeof state,
      `Then ${assertion.text} (boundary ${assertion.boundary + 1}) has no textspec`,
    ).toEqual('string')
    if (typeof state !== 'string') {
      throw new Error('Missing textspec')
    }
    if (assertion.kind === 'state') {
      const actual = /(?<!\\)[|^]/.test(assertion.expected)
        ? state
        : state.replace(/(?<!\\)[|^]/g, '')
      expect(
        actual,
        `Then ${assertion.text} (boundary ${assertion.boundary + 1})`,
      ).toEqual(assertion.expected)
    } else {
      const marker =
        assertion.kind === 'before'
          ? `|${assertion.expected}`
          : `${assertion.expected}|`
      expect(
        state.includes(marker),
        `Then ${assertion.text} (boundary ${assertion.boundary + 1}): ${state}`,
      ).toEqual(true)
    }
  }
}

function normalize(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/;;/g, '\n')
}
