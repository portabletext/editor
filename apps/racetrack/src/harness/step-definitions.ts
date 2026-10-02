import {
  stepDefinitions as editorStepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {Then, type StepDefinition} from 'racejar'
import type {Recorder} from './recorder.ts'

export type RacetrackStepDefinition = StepDefinition<Context, any, any, any>

type StepCallback = (
  context: Context,
  ...args: Array<unknown>
) => Promise<void> | void

export const captureStepText = 'capture the state'

const typingStepTexts = new Set([
  '{string} is typed',
  '{string} is typed in Editor B',
])

export function ownStepDefinitions(
  recorder: Recorder,
): Array<RacetrackStepDefinition> {
  return [
    Then(captureStepText, async () => {
      await recorder.capture('capture')
    }),
  ]
}

/**
 * The shared and Racetrack step definitions, bound to the context that
 * `scenarioContext` returns instead of the one racejar passes: racejar hands
 * every scenario of a feature the same mutable object, so a scenario would
 * otherwise see the editors of the one before it.
 */
export function racetrackStepDefinitions({
  recorder,
  scenarioContext,
}: {
  recorder: Recorder
  scenarioContext: () => Context
}): Array<RacetrackStepDefinition> {
  for (const text of typingStepTexts) {
    if (!editorStepDefinitions.some((definition) => definition.text === text)) {
      throw new Error(
        `The shared step definitions no longer contain "${text}", so Racetrack cannot warn about typing steps that type nothing`,
      )
    }
  }

  return [...editorStepDefinitions, ...ownStepDefinitions(recorder)].map(
    (definition) => {
      const callback = definition.callback as StepCallback
      const isTypingStep = typingStepTexts.has(definition.text)

      return {
        ...definition,
        callback: (_racejarContext: Context, ...args: Array<unknown>) => {
          if (isTypingStep) {
            recorder.markTypingStep()
          }
          return callback(scenarioContext(), ...args)
        },
      }
    },
  )
}
