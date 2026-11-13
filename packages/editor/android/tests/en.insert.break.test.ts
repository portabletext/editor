// thumbjar-test-count: 9
import {readFileSync} from 'node:fs'
import type {Scenario} from 'racejar'
import {Feature} from 'racejar/vitest'
import {deviceDefinitions} from '../scripts/gherkin.ts'

const knownDifferences = [
  {
    scenario: 'Pressing Enter when selecting the entire content',
    boundary: 4,
    actual: 'B: \nB: |',
  },
  {
    scenario: 'Pressing Enter when selecting the entire content',
    boundary: 5,
    actual: 'B: |',
  },
]

Feature({
  featureText: readFileSync(
    new URL('../../gherkin-spec/insert.break.feature', import.meta.url),
    'utf8',
  ),
  ...deviceDefinitions(undefined, knownDifferences),
  expectFail: (scenario: Scenario) =>
    knownDifferences.some(
      (difference) => difference.scenario === scenario.name,
    ),
})
