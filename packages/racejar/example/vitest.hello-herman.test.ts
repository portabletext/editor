import {expect} from 'vitest'
import {Given, Then, When} from '../src/step-definitions'
import {Feature} from '../src/vitest'

function greet(name: string, greeting: string) {
  return `Hello ${name}, ${greeting}`
}

type Context = {
  greetingPrefix: string
  person: string
  greeting: string
}

Feature({
  featureText: `
    Feature: Greeting
      Scenario: Greeting a person
        Given the person "Herman"
        When greeting the person with:
          | how are you? |
        Then the greeting is "Hello Herman, how are you?"`,
  stepDefinitions: [
    Given('the person {string}', (context: Context, person: string) => {
      context.person = person
    }),
    When(
      'greeting the person with:',
      (context: Context, greeting: string[][]) => {
        context.greeting = greet(context.person, greeting.at(0)?.at(0) ?? '')
      },
    ),
    Then('the greeting is {string}', (context: Context, greeting: string) => {
      expect(context.greeting).toBe(greeting)
    }),
  ],
})
