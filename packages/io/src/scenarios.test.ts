import {After} from 'racejar'
import {Feature} from 'racejar/vitest'
import {vi} from 'vitest'
import closeFeature from '../features/close.feature?raw'
import lifecycleFeature from '../features/lifecycle.feature?raw'
import receivingFeature from '../features/receiving.feature?raw'
import sendingFeature from '../features/sending.feature?raw'
import {
  parameterTypes,
  stepDefinitions,
  type Context,
} from './test/step-definitions'

/**
 * Scenarios of the validity slice (read-only, blocked, repair, discard,
 * stalled and corrections), which 1.0 leaves out. They stay in the feature
 * files as written and are skipped here.
 */
const notIn1 = new Set([
  'Closing while invalid drops unsent work',
  'Resync, discard, repair and changes before ready are violations',
  'Resync can make the field invalid and valid again',
  'Waiting for an echo becomes stalled',
  'A repair waits for the mutation in flight, then goes out alone',
  "A correction after the user's own edit is saved with it",
  'A held transaction does not change validity',
])

for (const featureText of [
  lifecycleFeature,
  sendingFeature,
  receivingFeature,
  closeFeature,
]) {
  Feature({
    featureText: skipScenarios(featureText, notIn1),
    hooks: [
      After<Context>(() => {
        vi.useRealTimers()
      }),
    ],
    stepDefinitions,
    parameterTypes,
  })
}

function skipScenarios(featureText: string, names: Set<string>): string {
  return featureText.replace(
    /^(\s*)Scenario: (.*)$/gm,
    (line, indent: string, name: string) =>
      names.has(name) ? `${indent}@skip\n${line}` : line,
  )
}
