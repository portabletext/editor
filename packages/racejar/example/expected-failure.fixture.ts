import {expect} from 'vitest'
import {After} from '../src/hooks'
import {Given} from '../src/step-definitions'
import {Feature} from '../src/vitest'

const mode = process.env['RACEJAR_PROBE'] ?? 'broken'
Feature({
  featureText: `Feature: Expected failures
${mode === 'skip' ? '@skip' : mode === 'only' ? '@only' : ''}
Scenario: marked
Given "foo"
Scenario: ordinary
Given "bar"`,
  expectFail: (scenario) =>
    scenario.name === (mode === 'stale' ? 'deleted' : 'marked'),
  stepDefinitions: [
    Given('{string}', (context: {value: string}, value: string) => {
      context.value = value
    }),
  ],
  hooks: [
    After((context: {value: string}) => {
      expect(context.value).toEqual(
        (context.value === 'foo' && mode !== 'fixed') ||
          mode === 'ordinary-broken'
          ? 'baz'
          : context.value,
      )
    }),
  ],
})
