import {expect} from 'vitest'
import {Given, Then} from '../src/step-definitions'
import {Feature} from '../src/vitest'

type Context = {
  note?: string
}

Feature({
  featureText: `
    Feature: Context isolation
      Scenario: Writing to the context
        Given the note "first"
        Then the note is "first"

      Scenario: Starting with a fresh context
        Then the note is unset`,
  stepDefinitions: [
    Given('the note {string}', (context: Context, note: string) => {
      context.note = note
    }),
    Then('the note is {string}', (context: Context, note: string) => {
      expect(context.note).toBe(note)
    }),
    Then('the note is unset', (context: Context) => {
      expect(context.note).toBeUndefined()
    }),
  ],
})
