import {Given, Then} from 'racejar'
import {Feature} from 'racejar/vitest'
import {expect} from 'vitest'

type Context = {
  documentText: string
}

Feature({
  featureText: `
    Feature: Wiring
      Scenario: A step runs
        Given the document is "B: foo|"
        Then the document text is "B: foo|"`,
  stepDefinitions: [
    Given('the document is {string}', (context: Context, text: string) => {
      context.documentText = text
    }),
    Then('the document text is {string}', (context: Context, text: string) => {
      expect(context.documentText).toEqual(text)
    }),
  ],
})
