import type {ParameterType} from '@cucumber/cucumber-expressions'
import {
  CucumberExpression,
  ParameterTypeRegistry,
} from '@cucumber/cucumber-expressions'
import * as Gherkin from '@cucumber/gherkin'
import * as Messages from '@cucumber/messages'
import type {
  StepDefinition,
  StepDefinitionCallbackParameters,
} from './step-definitions'

/**
 * @public
 */
export type CompiledFeature = {
  name: string
  tag?: 'only' | 'skip'
  scenarios: Array<{
    name: string
    tag?: 'only' | 'skip'
    steps: Array<() => Promise<void> | void>
  }>
}

/**
 * @public
 */
export function compileFeature<TContext extends Record<string, any> = object>({
  featureText,
  stepDefinitions,
  parameterTypes,
}: {
  featureText: string
  stepDefinitions: Array<StepDefinition<TContext, any, any, any>>
  parameterTypes?: Array<ParameterType<unknown>>
}): CompiledFeature {
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
  if (parameterTypes) {
    parameterTypes.forEach((parameterType) =>
      parameterTypeRegistry.defineParameterType(parameterType),
    )
  }

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

  const scenarios = pickles.map((pickle) => {
    const skippedPickle = pickle.tags.some((tag) => tag.name === '@skip')
    const onlyPickle = pickle.tags.some((tag) => tag.name === '@only')
    const context = {} as TContext

    const steps = pickle.steps.map((step) => {
      const matchingSteps = stepImplementations
        .filter((stepImplementation) => stepImplementation.type === step.type)
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
        throw new Error(`Multiple implementations found for step: ${step.text}`)
      }

      const args = matchingStep.args.map((arg) =>
        arg.getValue(matchingStep),
      ) as StepDefinitionCallbackParameters<any, any, any>

      return () => matchingStep.callback(context, ...args)
    })

    return {
      name: pickle.name,
      tag: skippedFeature
        ? ('skip' as const)
        : skippedPickle
          ? ('skip' as const)
          : onlyPickle
            ? ('only' as const)
            : undefined,
      steps,
    }
  })

  return {
    tag: skippedFeature ? 'skip' : onlyFeature ? 'only' : undefined,
    name: gherkinDocument.feature.name,
    scenarios,
  }
}
