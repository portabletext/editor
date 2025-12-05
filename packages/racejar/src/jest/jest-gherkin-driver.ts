import type {ParameterType} from '@cucumber/cucumber-expressions'
import {afterEach, beforeEach, describe, test} from '@jest/globals'
import {compileFeature} from '../compile-feature'
import type {Hook} from '../hooks'
import type {StepDefinition} from '../step-definitions'

/**
 * @public
 */
export function Feature<TContext extends Record<string, any> = object>({
  featureText,
  hooks,
  stepDefinitions,
  parameterTypes,
}: {
  featureText: string
  hooks: Array<Hook<TContext>>
  stepDefinitions: Array<StepDefinition<TContext, any, any, any>>
  parameterTypes?: Array<ParameterType<unknown>>
}) {
  const feature = compileFeature({
    featureText,
    hooks: hooks ?? [],
    stepDefinitions,
    parameterTypes: parameterTypes ?? [],
  })

  const skipFeature = feature.tags.includes('@skip')
  const onlyFeature = feature.tags.includes('@only')

  const describeFn = onlyFeature
    ? describe.only
    : skipFeature
      ? describe.skip
      : describe

  describeFn(feature.name, () => {
    for (const before of feature.beforeHooks) {
      beforeEach(before)
    }

    for (const after of feature.afterHooks) {
      afterEach(after)
    }

    for (const scenario of feature.scenarios) {
      const tags = scenario.tags
      const skip = skipFeature || tags.includes('@skip')
      const only = tags.includes('@only')

      const testFn = only ? test.only : skip ? test.skip : test

      testFn(scenario.name, async () => {
        for (const step of scenario.steps) {
          await step()
        }
      })
    }
  })
}
