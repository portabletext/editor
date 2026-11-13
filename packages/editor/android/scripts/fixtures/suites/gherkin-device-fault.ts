import {Feature} from 'racejar/vitest'
import {deviceDefinitions} from '../../gherkin.ts'

Feature({
  featureText: `Feature: device faults
Scenario: marked row
Given the editor state is "B: foo"
Then the editor state is "B: foo|"`,
  expectFail: () => true,
  ...deviceDefinitions(() => {
    throw new Error('Device mistap')
  }, [{scenario: 'marked row', boundary: 1, actual: 'B: bar|'}]),
})
