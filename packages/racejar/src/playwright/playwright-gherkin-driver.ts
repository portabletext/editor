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
      ? test.describe.only
      : feature.tag === 'skip'
        ? test.describe.skip
        : test.describe

  describeFn(feature.name, () => {
    for (const before of feature.beforeHooks) {
      test.beforeEach(
        withPlaywright(async (playwrightOptions) => {
          await before({
            playwright: playwrightOptions,
          } as TContext)
        }),
      )
    }

    for (const after of feature.afterHooks) {
      test.afterEach(
        withPlaywright(async (playwrightOptions) => {
          await after({
            playwright: playwrightOptions,
          } as TContext)
        }),
      )
    }

    for (const scenario of feature.scenarios) {
      const testFn =
        scenario.tag === 'only'
          ? test.only
          : scenario.tag === 'skip'
            ? test.skip
            : test

      testFn(
        scenario.name,
        withPlaywright(async (playwrightOptions) => {
          test.fail(scenario.expectedFailure)
          for (const step of scenario.steps) {
            await step({
              playwright: playwrightOptions,
            } as TContext)
          }
        }),
      )
    }
  })
}

function withPlaywright(
  callback: (options: PlaywrightOptions) => Promise<void>,
) {
  // Playwright discovers fixtures from explicit destructuring in the callback.
  return async ({
    browserName,
    defaultBrowserType,
    headless,
    channel,
    launchOptions,
    connectOptions,
    reuseContext,
    screenshot,
    trace,
    video,
    acceptDownloads,
    bypassCSP,
    colorScheme,
    clientCertificates,
    deviceScaleFactor,
    extraHTTPHeaders,
    geolocation,
    hasTouch,
    httpCredentials,
    ignoreHTTPSErrors,
    isMobile,
    javaScriptEnabled,
    locale,
    offline,
    permissions,
    proxy,
    storageState,
    timezoneId,
    userAgent,
    viewport,
    baseURL,
    contextOptions,
    actionTimeout,
    navigationTimeout,
    serviceWorkers,
    testIdAttribute,
    playwright,
    browser,
    context,
    page,
    request,
    mount,
  }: PlaywrightOptions) =>
    callback({
      browserName,
      defaultBrowserType,
      headless,
      channel,
      launchOptions,
      connectOptions,
      reuseContext,
      screenshot,
      trace,
      video,
      acceptDownloads,
      bypassCSP,
      colorScheme,
      clientCertificates,
      deviceScaleFactor,
      extraHTTPHeaders,
      geolocation,
      hasTouch,
      httpCredentials,
      ignoreHTTPSErrors,
      isMobile,
      javaScriptEnabled,
      locale,
      offline,
      permissions,
      proxy,
      storageState,
      timezoneId,
      userAgent,
      viewport,
      baseURL,
      contextOptions,
      actionTimeout,
      navigationTimeout,
      serviceWorkers,
      testIdAttribute,
      playwright,
      browser,
      context,
      page,
      request,
      mount,
    })
}
