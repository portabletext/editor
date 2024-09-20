import {
  CucumberExpression,
  ParameterTypeRegistry,
  type ParameterType,
} from '@cucumber/cucumber-expressions'
import * as Gherkin from '@cucumber/gherkin'
import * as Messages from '@cucumber/messages'
import {describe, test} from '@jest/globals'

type StepDefinitionCallbackParameters<
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
> = TParamA extends undefined
  ? []
  : TParamB extends undefined
    ? [TParamA]
    : TParamC extends undefined
      ? [TParamA, TParamB]
      : [TParamA, TParamB, TParamC]

export type StepDefinitionCallback<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
> = (
  context: TContext,
  ...args: StepDefinitionCallbackParameters<TParamA, TParamB, TParamC>
) => Promise<void>

export type StepDefinition<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
> = {
  type: 'Context' | 'Action' | 'Outcome'
  text: string
  callback: StepDefinitionCallback<TContext, TParamA, TParamB, TParamC>
}

export function Given<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
>(
  text: string,
  callback: StepDefinitionCallback<TContext, TParamA, TParamB, TParamC>,
): StepDefinition<TContext, TParamA, TParamB, TParamC> {
  return {type: 'Context', text, callback}
}

export function When<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
>(
  text: string,
  callback: StepDefinitionCallback<TContext, TParamA, TParamB, TParamC>,
): StepDefinition<TContext, TParamA, TParamB, TParamC> {
  return {type: 'Action', text, callback}
}

export function Then<
  TContext extends Record<string, any> = object,
  TParamA = undefined,
  TParamB = undefined,
  TParamC = undefined,
>(
  text: string,
  callback: StepDefinitionCallback<TContext, TParamA, TParamB, TParamC>,
): StepDefinition<TContext, TParamA, TParamB, TParamC> {
  return {type: 'Outcome', text, callback}
}

export function Feature<TContext extends Record<string, any> = object>({
  featureText,
  stepDefinitions,
  parameterTypes,
}: {
  featureText: string
  stepDefinitions: Array<StepDefinition<TContext, any, any, any>>
  parameterTypes: Array<ParameterType<unknown>>
}) {
  const uuidFn = Messages.IdGenerator.uuid()
  const builder = new Gherkin.AstBuilder(uuidFn)
  const matcher = new Gherkin.GherkinClassicTokenMatcher()
  const parser = new Gherkin.Parser(builder, matcher)

  const gherkinDocument = parser.parse(featureText)
  const pickles = Gherkin.compile(
    gherkinDocument,
    (gherkinDocument.feature?.name ?? '').replace(' ', '-'),
    uuidFn,
  )

  const parameterTypeRegistry = new ParameterTypeRegistry()
  parameterTypes.forEach((parameterType) =>
    parameterTypeRegistry.defineParameterType(parameterType),
  )

  if (!gherkinDocument.feature) {
    throw new Error('No feature found')
  }

  const stepImplementations = stepDefinitions.map((stepDefinition) => {
    const expression = new CucumberExpression(
      stepDefinition.text,
      parameterTypeRegistry,
    )

    return {
      type: stepDefinition.type,
      text: stepDefinition.text,
      expression,
      callback: stepDefinition.callback,
    }
  })

  const skippedFeature = gherkinDocument.feature.tags.some(
    (tag) => tag.name === '@skip',
  )
  const onlyFeature = gherkinDocument.feature.tags.some(
    (tag) => tag.name === '@only',
  )

  if (skippedFeature && onlyFeature) {
    throw new Error('Feature cannot have both @skip and @only tags')
  }

  const describeFn = onlyFeature
    ? describe.only
    : skippedFeature
      ? describe.skip
      : describe

  describeFn(`Feature: ${gherkinDocument.feature.name}`, () => {
    for (const pickle of pickles) {
      const skippedPickle = pickle.tags.some((tag) => tag.name === '@skip')
      const onlyPickle = pickle.tags.some((tag) => tag.name === '@only')
      const testFn = skippedFeature
        ? test.skip
        : skippedPickle
          ? test.skip
          : onlyPickle
            ? test.only
            : test

      testFn(`Scenario: ${pickle.name}`, async () => {
        const context = {} as TContext

        for (const step of pickle.steps) {
          const matchingSteps = stepImplementations
            .filter(
              (stepImplementation) => stepImplementation.type === step.type,
            )
            .flatMap((stepImplementation) => {
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
            throw new Error(
              `Multiple implementations found for step: ${step.text}`,
            )
          }

          const args = matchingStep.args.map((arg) =>
            arg.getValue(matchingStep),
          ) as StepDefinitionCallbackParameters<any, any, any>

          await matchingStep.callback(context, ...args)
        }
      })
    }
  })
}
