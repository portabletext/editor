import type {ParameterType} from '@cucumber/cucumber-expressions'
import {test as baseTest, type TestType} from '@playwright/test'
import {compileFeature, type Scenario} from '../compile-feature'
import type {Hook} from '../hooks'
import type {StepDefinition} from '../step-definitions'

/** @public */
export type PlaywrightFixtures<
  TTest extends TestType<any, any> = typeof baseTest,
> =
  TTest extends TestType<infer TTestArgs, infer TWorkerArgs>
    ? TTestArgs & TWorkerArgs
    : never

/** @public */
export type PlaywrightContext<
  TFixtures extends Record<string, any> = Pick<
    PlaywrightFixtures,
    'page' | 'context'
  >,
> = {playwright: TFixtures}

type NamedFixtures<
  TTest extends TestType<any, any>,
  TNames extends ReadonlyArray<string>,
> = Pick<
  PlaywrightFixtures<TTest>,
  TNames[number] & keyof PlaywrightFixtures<TTest>
>

type FeatureContext<TContext, TFixtures extends Record<string, any>> = Omit<
  TContext,
  'playwright'
> &
  PlaywrightContext<TFixtures>

/** @public */
export function Feature<
  TTest extends TestType<any, any> = typeof baseTest,
  const TNames extends ReadonlyArray<string> = readonly ['page', 'context'],
  TContext extends Record<string, any> = PlaywrightContext<
    NamedFixtures<TTest, TNames>
  >,
>(options: {
  test?: TTest
  fixtures?: TNames &
    ReadonlyArray<Extract<keyof PlaywrightFixtures<TTest>, string>>
  featureText: string
  expectFail?: (scenario: Scenario) => boolean
  hooks?: Array<
    Hook<NoInfer<FeatureContext<TContext, NamedFixtures<TTest, TNames>>>>
  >
  stepDefinitions: Array<
    StepDefinition<
      NoInfer<FeatureContext<TContext, NamedFixtures<TTest, TNames>>>,
      any,
      any,
      any
    >
  > &
    Array<StepDefinition<TContext, any, any, any>>
  parameterTypes?: Array<ParameterType<unknown>>
}): void {
  const test: TestType<any, any> = options.test ?? baseTest
  const names = [...new Set(options.fixtures ?? ['page', 'context'])]
  for (const name of names) {
    if (!/^[A-Za-z_$][\w$]*$/.test(name) || reservedWords.has(name)) {
      throw new Error(
        `racejar: fixture name "${name}" is not a plain JavaScript identifier`,
      )
    }
  }

  type Context = FeatureContext<TContext, NamedFixtures<TTest, TNames>>
  const feature = compileFeature<Context, Context>({
    featureText: options.featureText,
    expectFail: options.expectFail,
    hooks: options.hooks ?? [],
    stepDefinitions: options.stepDefinitions,
    parameterTypes: options.parameterTypes ?? [],
  })
  const runWithFixtures = (run: (context: Context) => Promise<void> | void) =>
    fixtureCallback(names, (fixtures) => run({playwright: fixtures} as Context))

  const describeFn =
    feature.tag === 'only'
      ? test.describe.only
      : feature.tag === 'skip'
        ? test.describe.skip
        : test.describe

  describeFn(feature.name, () => {
    for (const before of feature.beforeHooks) {
      test.beforeEach(runWithFixtures(before))
    }
    for (const after of feature.afterHooks) {
      test.afterEach(runWithFixtures(after))
    }
    for (const scenario of feature.scenarios) {
      // Playwright has no `test.only.fail`, so a focused marked row declares
      // the expected failure from inside its body.
      const focusedFailure = scenario.tag === 'only' && scenario.expectedFailure
      const testFn =
        scenario.tag === 'only'
          ? test.only
          : scenario.tag === 'skip'
            ? test.skip
            : scenario.expectedFailure
              ? test.fail
              : test
      testFn(
        scenario.name,
        runWithFixtures(async (context) => {
          if (focusedFailure) {
            test.fail()
          }
          for (const step of scenario.steps) {
            await step(context)
          }
        }),
      )
    }
  })
}

function fixtureCallback(
  names: ReadonlyArray<string>,
  run: (fixtures: Record<string, any>) => Promise<void> | void,
): (fixtures: Record<string, any>) => Promise<void> {
  // Playwright reads the callback source to pick which fixtures to set up.
  const list = names.join(', ')
  // The callback parameter takes a name no fixture uses, so a fixture can be
  // called `run`.
  let callback = 'run'
  while (names.includes(callback)) {
    callback += '_'
  }
  return new Function(
    callback,
    `return async ({${list}}) => ${callback}({${list}})`,
  )(run)
}

const reservedWords = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])
