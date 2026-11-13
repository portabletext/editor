import type {ParameterType} from '@cucumber/cucumber-expressions'
import {afterEach, beforeEach, describe, test} from '@jest/globals'
import {compileFeature, type Scenario} from '../compile-feature'
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
  expectFail,
}: {
  featureText: string
  expectFail?: (scenario: Scenario) => boolean
  hooks?: Array<Hook<TContext>>
  stepDefinitions: Array<StepDefinition<TContext, any, any, any>>
  parameterTypes?: Array<ParameterType<unknown>>
}) {
  const feature = compileFeature({
    featureText,
    expectFail,
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

    for (const before of feature.beforeHooks) {
      beforeEach(() => before())
    }

    let afterHooksRun = 0
    for (const after of feature.afterHooks) {
      afterEach(async () => {
        const skip = expectedFailure
        afterHooksRun += 1
        if (afterHooksRun === feature.afterHooks.length) {
          afterHooksRun = 0
          expectedFailure = false
        }
        if (!skip) {
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
            await runAfterHooks(feature.afterHooks)
          }
        }
      })
    }
  })
}

async function runAfterHooks(afterHooks: Array<() => Promise<void> | void>) {
  const errors: Array<unknown> = []
  for (const after of afterHooks) {
    try {
      await after()
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length === 1) {
    throw errors[0]
  }
  if (errors.length > 1) {
    throw new AggregateError(errors)
  }
}
