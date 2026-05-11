/**
 * Browser-side mirror of racejar's vitest gherkin driver.
 *
 * Compiles a feature file and runs each scenario step-by-step,
 * emitting `onStep` updates so the UI can paint live status while a
 * run is in progress. Stops a scenario at its first failure and moves
 * on to the next.
 *
 * The vitest driver wraps each scenario in a `describe`/`test` pair so
 * vitest owns lifecycle; here we own it ourselves and report through
 * `onStep`.
 */

// biome-ignore-all lint/suspicious/noExplicitAny: racejar's StepDefinition
// and Hook are parametrised across optional arg types we don't constrain
// for the caller.

import {
  compileFeature,
  type Hook,
  type ParameterType,
  type StepDefinition,
} from 'racejar'

export type StepStatus = 'idle' | 'running' | 'pass' | 'fail'

export type StepResult = {
  scenarioIndex: number
  stepIndex: number
  status: StepStatus
  error?: Error
}

export type ScenarioResult = {
  scenarioIndex: number
  name: string
  status: 'pass' | 'fail' | 'skip'
  failedStepIndex?: number
  error?: Error
}

export type RunFeatureArgs = {
  featureText: string
  stepDefinitions: Array<StepDefinition<any, any, any, any>>
  parameterTypes?: Array<ParameterType<unknown>>
  hooks?: Array<Hook<any>>
  onStep: (result: StepResult) => void
  onScenarioComplete?: (result: ScenarioResult) => void
  /**
   * Called after every scenario (both pass and fail) once all
   * after-hooks have run. The mention-picker run uses this to unmount
   * the test editor created by `createTestEditor`, so the next
   * scenario starts with a clean document.body and `page.getByTestId`
   * does not match a stale element from the previous editor.
   */
  betweenScenarios?: () => Promise<void> | void
}

export async function runFeature(args: RunFeatureArgs): Promise<{
  scenarios: Array<ScenarioResult>
}> {
  const compiled = compileFeature({
    featureText: args.featureText,
    hooks: args.hooks,
    stepDefinitions: args.stepDefinitions,
    parameterTypes: args.parameterTypes,
  })

  const results: Array<ScenarioResult> = []

  for (let s = 0; s < compiled.scenarios.length; s++) {
    const scenario = compiled.scenarios[s]!
    if (scenario.tag === 'skip') {
      results.push({
        scenarioIndex: s,
        name: scenario.name,
        status: 'skip',
      })
      args.onScenarioComplete?.(results[results.length - 1]!)
      continue
    }

    const stepContext: Record<string, unknown> = {}

    let scenarioFailed = false
    let failedStepIndex: number | undefined
    let failedError: Error | undefined

    try {
      for (const before of compiled.beforeHooks) {
        await before(stepContext)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      // Surface a Before-hook failure as a failure on step 0 so the
      // user sees red in the left panel rather than silent idle dots.
      args.onStep({
        scenarioIndex: s,
        stepIndex: 0,
        status: 'fail',
        error: new Error(`Before hook: ${error.message}`),
      })
      scenarioFailed = true
      failedStepIndex = 0
      failedError = error
    }

    if (!scenarioFailed) {
      for (let st = 0; st < scenario.steps.length; st++) {
        args.onStep({scenarioIndex: s, stepIndex: st, status: 'running'})
        try {
          await scenario.steps[st]!(stepContext)
          args.onStep({scenarioIndex: s, stepIndex: st, status: 'pass'})
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          args.onStep({
            scenarioIndex: s,
            stepIndex: st,
            status: 'fail',
            error,
          })
          scenarioFailed = true
          failedStepIndex = st
          failedError = error
          break
        }
      }
    }

    for (const after of compiled.afterHooks) {
      try {
        await after(stepContext)
      } catch {
        // After-hook errors don't fail a scenario in racejar's vitest
        // driver either; vitest's afterEach reports them but the
        // scenario result is decided by the steps.
      }
    }

    const result: ScenarioResult = scenarioFailed
      ? {
          scenarioIndex: s,
          name: scenario.name,
          status: 'fail',
          failedStepIndex,
          error: failedError,
        }
      : {
          scenarioIndex: s,
          name: scenario.name,
          status: 'pass',
        }

    results.push(result)
    args.onScenarioComplete?.(result)

    if (args.betweenScenarios) {
      await args.betweenScenarios()
    }
  }

  return {scenarios: results}
}
