import type {ParameterType} from '@cucumber/cucumber-expressions'
import {
  test,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
  type PlaywrightWorkerArgs,
  type PlaywrightWorkerOptions,
} from '@playwright/test'
import {compileFeature} from '../compile-feature'
import type {Hook} from '../hooks'
import type {StepDefinition} from '../step-definitions'

type PlaywrightOptions = PlaywrightTestArgs &
  PlaywrightTestOptions &
  PlaywrightWorkerArgs &
  PlaywrightWorkerOptions

/**
 * @public
 */
export type PlaywrightContext = Record<'string', any> & {
  playwright: PlaywrightOptions
}

/**
 * @public
 */
export function Feature<
  TContext extends PlaywrightContext = PlaywrightContext,
>({
  featureText,
  hooks,
  stepDefinitions,
  parameterTypes,
}: {
  featureText: string
  hooks?: Array<Hook<TContext>>
  stepDefinitions: Array<StepDefinition<TContext, any, any, any>>
  parameterTypes?: Array<ParameterType<unknown>>
}) {
  const feature = compileFeature({
    featureText,
    hooks,
    stepDefinitions,
    parameterTypes,
  })

  const describeFn =
    feature.tag === 'only'
      ? test.describe.only
      : feature.tag === 'skip'
        ? test.describe.skip
        : test.describe

  describeFn(feature.name, () => {
    for (const before of feature.beforeHooks) {
      test.beforeEach(async (playwrightOptions) => {
        await before({
          playwright: playwrightOptions,
        } as TContext)
      })
    }

    for (const after of feature.afterHooks) {
      test.afterEach(async (playwrightOptions) => {
        await after({
          playwright: playwrightOptions,
        } as TContext)
      })
    }

    for (const scenario of feature.scenarios) {
      const testFn =
        scenario.tag === 'only'
          ? test.only
          : scenario.tag === 'skip'
            ? test.skip
            : test

      testFn(scenario.name, async (playwrightOptions) => {
        for (const step of scenario.steps) {
          await step({
            playwright: playwrightOptions,
          } as TContext)
        }
      })
    }
  })
}
