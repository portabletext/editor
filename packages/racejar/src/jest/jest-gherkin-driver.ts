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
  expectedFailures,
}: {
  featureText: string
  expectedFailures?: ReadonlyArray<string>
  hooks?: Array<Hook<TContext>>
  stepDefinitions: Array<StepDefinition<TContext, any, any, any>>
  parameterTypes?: Array<ParameterType<unknown>>
}) {
  const feature = compileFeature({
    featureText,
    expectedFailures,
    hooks: hooks ?? [],
    stepDefinitions,
    parameterTypes: parameterTypes ?? [],
  })

  const describeFn =
    feature.tag === 'only'
      ? describe.only
      : feature.tag === 'skip'
        ? describe.skip
        : describe

  describeFn(feature.name, () => {
    let expectedFailure = false
    beforeEach(() => {
      expectedFailure = false
    })
    for (const before of feature.beforeHooks) {
      beforeEach(before)
    }

    for (const after of feature.afterHooks) {
      afterEach(async () => {
        if (!expectedFailure) {
          await after()
        }
      })
    }

    for (const scenario of feature.scenarios) {
      const testFn =
        scenario.tag === 'only'
          ? test.only
          : scenario.tag === 'skip'
            ? test.skip
            : test

      const scenarioTest = scenario.expectedFailure ? testFn.failing : testFn

      scenarioTest(scenario.name, async () => {
        expectedFailure = scenario.expectedFailure
        try {
          for (const step of scenario.steps) {
            await step()
          }
        } finally {
          if (expectedFailure) {
            // Jest's `test.failing` only observes errors from the test body.
            for (const after of feature.afterHooks) {
              await after()
            }
          }
        }
      })
    }
  })
}
