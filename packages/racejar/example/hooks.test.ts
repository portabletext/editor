import {expect} from 'vitest'
import {After, Before} from '../src/hooks'
import {Given, Then, When} from '../src/step-definitions'
import {Feature} from '../src/vitest'

function greet(prefix: string, name: string) {
  return `${prefix} ${name}`
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
        When greeting the person
        Then the greeting is "Hello Herman"`,
  hooks: [
    Before((context: Context) => {
      context.greetingPrefix = 'Hello'
    }),
    After((context: Context) => {
      expect(context.greeting).toBe('Hello Herman')
    }),
  ],
  stepDefinitions: [
    Given('the person {string}', (context: Context, person: string) => {
      context.person = person
    }),
    When('greeting the person', (context: Context) => {
      context.greeting = greet(context.greetingPrefix, context.person)
    }),
    Then('the greeting is {string}', (context: Context, greeting: string) => {
      expect(context.greeting).toBe(greeting)
    }),
  ],
})
