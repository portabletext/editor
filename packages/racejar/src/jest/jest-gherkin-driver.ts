import type {ParameterType} from '@cucumber/cucumber-expressions'
import {describe, test} from '@jest/globals'
import {compileFeature} from '../compile-feature'
import type {StepDefinition} from '../step-definitions'

/**
 * @public
 */
export function Feature<TContext extends Record<string, any> = object>({
  featureText,
  stepDefinitions,
  parameterTypes,
}: {
  featureText: string
  stepDefinitions: Array<StepDefinition<TContext, any, any, any>>
  parameterTypes: Array<ParameterType<unknown>>
}) {
  const feature = compileFeature({
    featureText,
    stepDefinitions,
    parameterTypes,
  })

  const describeFn =
    feature.tag === 'only'
      ? describe.only
      : feature.tag === 'skip'
        ? describe.skip
        : describe

  describeFn(feature.name, () => {
    for (const scenario of feature.scenarios) {
      const testFn =
        scenario.tag === 'only'
          ? test.only
          : scenario.tag === 'skip'
            ? test.skip
            : test

      testFn(scenario.name, async () => {
        for (const step of scenario.steps) {
          await step()
        }
      })
    }
  })
}
