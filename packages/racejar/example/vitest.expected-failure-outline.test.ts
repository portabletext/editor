import {expect, test} from 'vitest'
import {compileFeature} from '../src/compile-feature'
import {Given} from '../src/step-definitions'

test('a name marks every outline row', () => {
  const feature = compileFeature({
    featureText: `Feature: outline
Scenario Outline: shared name
Given "<value>"
Examples:
| value |
| foo |
| bar |`,
    expectedFailures: ['shared name'],
    stepDefinitions: [Given('{string}', () => {})],
  })
  expect(feature.scenarios.map((scenario) => scenario.expectedFailure)).toEqual(
    [true, true],
  )
})
