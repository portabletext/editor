import {expect} from '@playwright/test'
import {After} from '../src/hooks'
import {Feature, type PlaywrightContext} from '../src/playwright'
import {Given} from '../src/step-definitions'

const mode = process.env['RACEJAR_PROBE'] ?? 'broken'
Feature<PlaywrightContext & {value: string}>({
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
