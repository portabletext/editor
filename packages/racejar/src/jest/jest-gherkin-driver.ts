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

  if (feature.scenarios.length === 0) {
    describeFn(feature.name, () => {
      registerHooks(feature.beforeHooks, feature.afterHooks)
    })
  }

  for (const scenario of feature.scenarios) {
    describeFn(feature.name, () => {
      const claim = {afterHooksStarted: false}
      const beforeHooks = [
        ...(scenario.expectedFailure
          ? [
              () => {
                claim.afterHooksStarted = false
              },
            ]
          : []),
        ...(scenario.expectedFailure ? [] : feature.beforeHooks),
      ]
      const afterHooks = scenario.expectedFailure
        ? [() => runAfterHooks(feature.afterHooks, claim)]
        : feature.afterHooks
      registerHooks(beforeHooks, afterHooks)
      const testFn =
        scenario.tag === 'only'
          ? test.only
          : scenario.tag === 'skip'
            ? test.skip
            : test

      const scenarioTest = scenario.expectedFailure ? testFn.failing : testFn

      scenarioTest(scenario.name, async () => {
        const row = claim
        try {
          if (scenario.expectedFailure) {
            for (const before of feature.beforeHooks) {
              await before()
            }
          }
          for (const step of scenario.steps) {
            await step()
          }
        } finally {
          if (scenario.expectedFailure) {
            await runAfterHooks(feature.afterHooks, row)
          }
        }
      })
    })
  }
}

function registerHooks(
  beforeHooks: Array<() => Promise<void> | void>,
  afterHooks: Array<() => Promise<void> | void>,
) {
  for (const before of beforeHooks) {
    beforeEach(() => before())
  }
  for (const after of afterHooks) {
    afterEach(() => after())
  }
}

async function runAfterHooks(
  afterHooks: Array<() => Promise<void> | void>,
  row: {afterHooksStarted: boolean},
) {
  if (row.afterHooksStarted) {
    return
  }
  row.afterHooksStarted = true
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
