import {parameterTypes} from '@portabletext/editor/test'
import type {Context} from '@portabletext/editor/test/vitest'
import {Given, Then, When} from 'racejar'
import {describe, expect, test} from 'vitest'
import {compileRacetrackFeature} from './compile.ts'
import type {RacetrackStepDefinition} from './step-definitions.ts'

describe(compileRacetrackFeature.name, () => {
  test('labels line up with Background, Scenario Outline, doc strings, and data tables', () => {
    const {feature, labels} = compileRacetrackFeature({
      featureText: [
        'Feature: Labels',
        '',
        '  Background:',
        '    Given one editor',
        '',
        '  Scenario: Doc string and data table',
        '    Given the editor state is',
        '      """',
        '      B: foo|',
        '      """',
        '    When data is pasted',
        '      | text/plain | bar |',
        '    Then capture the state',
        '    And the text is "foobar"',
        '',
        '  Scenario Outline: Typing',
        '    When <text> is typed',
        '    Then the text is <text>',
        '',
        '    Examples:',
        '      | text  |',
        '      | "foo" |',
        '      | "bar" |',
      ].join('\n'),
      stepDefinitions,
      parameterTypes,
      captureStepText: 'capture the state',
    })

    expect(feature.scenarios.map((scenario) => scenario.name)).toEqual([
      'Doc string and data table',
      'Typing',
      'Typing',
    ])
    expect(labels).toEqual([
      [
        {text: 'one editor', isAssertion: false},
        {text: 'the editor state is', isAssertion: false},
        {text: 'data is pasted', isAssertion: false},
        {text: 'capture the state', isAssertion: false},
        {text: 'the text is "foobar"', isAssertion: true},
      ],
      [
        {text: 'one editor', isAssertion: false},
        {text: '"foo" is typed', isAssertion: false},
        {text: 'the text is "foo"', isAssertion: true},
      ],
      [
        {text: 'one editor', isAssertion: false},
        {text: '"bar" is typed', isAssertion: false},
        {text: 'the text is "bar"', isAssertion: true},
      ],
    ])
  })

  test('rejects @only on a scenario', () => {
    expect(() =>
      compileRacetrackFeature({
        featureText: [
          'Feature: Focus',
          '',
          '  @only',
          '  Scenario: Focused',
          '    Given one editor',
        ].join('\n'),
        stepDefinitions,
        parameterTypes,
        captureStepText: 'capture the state',
      }),
    ).toThrowError(
      'Racetrack does not support @skip or @only. Remove the tag from "Focused" and put only the scenarios you want to run in the file.',
    )
  })

  test('rejects @skip on the feature', () => {
    expect(() =>
      compileRacetrackFeature({
        featureText: [
          '@skip',
          'Feature: Skipped',
          '',
          '  Scenario: Foo',
          '    Given one editor',
        ].join('\n'),
        stepDefinitions,
        parameterTypes,
        captureStepText: 'capture the state',
      }),
    ).toThrowError(
      'Racetrack does not support @skip or @only. Remove the tag from the feature "Skipped" and put only the scenarios you want to run in the file.',
    )
  })
})

const stepDefinitions: Array<RacetrackStepDefinition> = [
  Given('one editor', () => {}),
  Given('the editor state is', (_context: Context, _textspec: string) => {}),
  When(
    'data is pasted',
    (_context: Context, _dataTable: Array<Array<string>>) => {},
  ),
  When('{string} is typed', (_context: Context, _text: string) => {}),
  Then('capture the state', () => {}),
  Then('the text is {string}', (_context: Context, _text: string) => {}),
]
