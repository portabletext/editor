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
    Given('the person {string}', (context: Context, person: string) => {
      context.person = person
    }),
    When('greeting the person', (context: Context) => {
      context.greeting = greet(context.person)
    }),
    Then('the greeting is {string}', (context: Context, greeting: string) => {
      expect(context.greeting).toBe(greeting)
    }),
  ],
})
