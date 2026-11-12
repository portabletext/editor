import {readFileSync} from 'node:fs'
import {expect, test} from 'vitest'
import {compileFeature} from '../src/compile-feature'
import {Given, Then, When} from '../src/step-definitions'

test('selects an outline row by its example values and inherited tags', () => {
  const rows: Array<import('../src/compile-feature').Scenario> = []
  const feature = compileFeature({
    featureText: `@feature
Feature: outline
Rule: nested
@scenario
Scenario Outline: shared name
Given "<value>"
@examples
Examples:
| value |
| foo |
| bar |`,
    expectFail: (scenario) => {
      rows.push(scenario)
      return (
        scenario.name === 'shared name' &&
        scenario.examples?.['value'] === 'bar'
      )
    },
    stepDefinitions: [Given('{string}', () => {})],
  })
  expect(rows).toEqual([
    {
      name: 'shared name',
      tags: ['@feature', '@scenario', '@examples'],
      examples: {value: 'foo'},
    },
    {
      name: 'shared name',
      tags: ['@feature', '@scenario', '@examples'],
      examples: {value: 'bar'},
    },
  ])
  expect(feature.scenarios.map((scenario) => scenario.expectedFailure)).toEqual(
    [false, true],
  )
})

test('selects one of the four expanded-selection rows without changing their names', () => {
  const feature = compileFeature({
    featureText: readFileSync(
      new URL('../../editor/gherkin-spec/insert.text.feature', import.meta.url),
      'utf8',
    ),
    expectFail: (scenario) =>
      scenario.name === 'Inserting text on expanded selection' &&
      scenario.examples?.['selection'] === '"B: ^foo;;B: bar|"',
    stepDefinitions: [
      Given('{}', () => {}),
      When('{}', () => {}),
      Then('{}', () => {}),
    ],
  })
  expect(
    feature.scenarios.map((scenario) => ({
      name: scenario.name,
      expectedFailure: scenario.expectedFailure,
    })),
  ).toEqual([
    {name: 'Inserting text on expanded selection', expectedFailure: false},
    {name: 'Inserting text on expanded selection', expectedFailure: false},
    {name: 'Inserting text on expanded selection', expectedFailure: false},
    {name: 'Inserting text on expanded selection', expectedFailure: true},
  ])
})
