/** @jest-environment ./setup/collaborative.jest.env.ts */
import {
  CucumberExpression,
  ParameterType,
  ParameterTypeRegistry,
} from '@cucumber/cucumber-expressions'
import * as Gherkin from '@cucumber/gherkin'
import * as Messages from '@cucumber/messages'
import {describe, test} from '@jest/globals'

import {type Editor} from '../setup/globals.jest'

export type StepDefinitionCallback<TParamA, TParamB, TParamC> = (
  context: {editorA: Editor},
  ...args: Array<any>
) => Promise<void>

export type StepDefinition<TParamA, TParamB, TParamC> = {
  text: string
  callback: StepDefinitionCallback<TParamA, TParamB, TParamC>
}

export function defineStep<TParamA, TParamB, TParamC>(
  text: string,
  callback: StepDefinitionCallback<TParamA, TParamB, TParamC>,
): StepDefinition<TParamA, TParamB, TParamC> {
  return {text, callback}
}

const uuidFn = Messages.IdGenerator.uuid()
const builder = new Gherkin.AstBuilder(uuidFn)
const matcher = new Gherkin.GherkinClassicTokenMatcher()
const parser = new Gherkin.Parser(builder, matcher)

const parameterTypeRegistry = new ParameterTypeRegistry()
const buttonParameterType = new ParameterType(
  'button',
  /"(ArrowUp|ArrowDown|Backspace|Delete|Enter)"/,
  String,
  (input) => input,
  false,
  true,
)
const textParameterType = new ParameterType(
  'text',
  /"([a-z,\\n]*)"/,
  Array,
  (input) =>
    input.split(',').map((item) => {
      if (item === '\\n') {
        return '\n'
      }
      return item
    }),
  false,
  true,
)
parameterTypeRegistry.defineParameterType(textParameterType)
parameterTypeRegistry.defineParameterType(buttonParameterType)

export function Feature<TParamA, TParamB, TParamC>(
  featureText: string,
  stepDefinitions: Array<StepDefinition<TParamA, TParamB, TParamC>>,
) {
  const gherkinDocument = parser.parse(featureText)
  const pickles = Gherkin.compile(gherkinDocument, 'block-objects.feature', uuidFn)

  if (!gherkinDocument.feature) {
    throw new Error('No feature found')
  }

  const stepImplementations = stepDefinitions.map((stepDefinition) => {
    const expression = new CucumberExpression(stepDefinition.text, parameterTypeRegistry)

    return {
      text: stepDefinition.text,
      expression,
      callback: stepDefinition.callback,
    }
  })

  const skippedFeature = gherkinDocument.feature.tags.some((tag) => tag.name === '@skip')
  const onlyFeature = gherkinDocument.feature.tags.some((tag) => tag.name === '@only')
  const describeFn = onlyFeature ? describe.only : skippedFeature ? describe.skip : describe

  describeFn(`Feature: ${gherkinDocument.feature.name}`, () => {
    for (const pickle of pickles) {
      const skippedPickle = pickle.tags.some((tag) => tag.name === '@skip')
      const onlyPickle = pickle.tags.some((tag) => tag.name === '@only')
      const testFn = onlyPickle ? test.only : skippedPickle ? test.skip : test

      testFn(`Scenario: ${pickle.name}`, async () => {
        const [editorA] = await getEditors()

        for await (const step of pickle.steps) {
          const matchingSteps = stepImplementations.flatMap((stepImplementation) => {
            const args = stepImplementation.expression.match(step.text)

            if (args) {
              return [
                {
                  ...stepImplementation,
                  args,
                },
              ]
            }

            return []
          })

          const matchingStep = matchingSteps[0]

          if (!matchingStep) {
            throw new Error(`No implementation found for step: ${step.text}`)
          }

          if (matchingSteps.length > 1) {
            throw new Error(`Multiple implementations found for step: ${step.text}`)
          }

          const args = matchingStep.args.map((arg) => arg.getValue(matchingStep))

          await matchingStep.callback({editorA}, ...args)
        }
      })
    }
  })
}
