import {Feature} from 'racejar/vitest'
import {deviceDefinitions} from '../../gherkin.ts'

Feature({
  featureText: `Feature: driver skips
Scenario: Pressing Enter when selecting the entire content
Given the editor state is "B: foo"
Then the editor state is "B: foo|"`,
  expectFail: () => true,
  ...deviceDefinitions(
    (context) => context.skip('Gboard cannot drive step 1'),
    [
      {
        scenario: 'Pressing Enter when selecting the entire content',
        boundary: 1,
        actual: 'B: bar|',
      },
    ],
  ),
})
