import {expect} from 'vitest'
import {Given, Then, When} from '../src/step-definitions'
import {Feature} from '../src/vitest'

function greet(name: string) {
  return `Hello, ${name}!`
}

type Context = {
  person: string
  greeting: string
}

Feature({
  featureText: `
    Feature: Greeting
      Scenario: Greeting a person
        Given the person "Herman"
        When greeting the person
        Then the greeting is "Hello, Herman!"`,
  stepDefinitions: [
    Given<Context, string>('the person {string}', (context, person) => {
      context.person = person
    }),
    When<Context>('greeting the person', (context) => {
      context.greeting = greet(context.person)
    }),
    Then<Context, string>('the greeting is {string}', (context, greeting) => {
      expect(context.greeting).toBe(greeting)
    }),
  ],
})
