import {parameterTypes} from '@portabletext/editor/test'
import type {Context} from '@portabletext/editor/test/vitest'
import type {CompiledFeature} from 'racejar'
import {test} from 'vitest'
import {commands} from 'vitest/browser'
import type {RacetrackReport, ScenarioResult} from '../bundle.ts'
import {compileRacetrackFeature, type StepLabel} from './compile.ts'
import {createRecorder, type Recorder} from './recorder.ts'
import {captureStepText, racetrackStepDefinitions} from './step-definitions.ts'

declare module 'vitest/browser' {
  interface BrowserCommands {
    racetrackReport: (report: RacetrackReport) => Promise<void>
  }
}

type AbandonedStep = {
  scenario: string
  step: string
}

/**
 * Registers one vitest test per scenario. The outcome of a scenario travels
 * to Node through the `racetrackReport` command, not through vitest's own
 * pass or fail.
 */
export function runFeature({
  featureText,
  stepTimeout,
}: {
  featureText: string
  stepTimeout: number
}) {
  const recorder = createRecorder()
  let scenarioContext = {} as Context
  let abandonedStep: AbandonedStep | undefined
  let compiled: ReturnType<typeof compileRacetrackFeature>

  try {
    compiled = compileRacetrackFeature({
      featureText,
      stepDefinitions: racetrackStepDefinitions({
        recorder,
        scenarioContext: () => scenarioContext,
      }),
      parameterTypes,
      captureStepText,
    })
  } catch (error) {
    test('compile the feature', async () => {
      await commands.racetrackReport({
        type: 'compile error',
        error: errorMessage(error),
      })
    })
    return
  }

  const {feature, labels} = compiled

  feature.scenarios.forEach((scenario, scenarioIndex) => {
    test(scenario.name, async () => {
      if (abandonedStep) {
        await commands.racetrackReport({
          type: 'scenario',
          result: notRunResult(scenario.name, abandonedStep),
        })
        return
      }

      scenarioContext = {} as Context
      const {result, timedOutStep} = await runScenario({
        name: scenario.name,
        steps: scenario.steps,
        labels: labels[scenarioIndex] ?? [],
        recorder,
        context: scenarioContext,
        stepTimeout,
      })

      if (timedOutStep !== undefined) {
        abandonedStep = {scenario: scenario.name, step: timedOutStep}
      }

      await commands.racetrackReport({type: 'scenario', result})
    })
  })
}

async function runScenario({
  name,
  steps,
  labels,
  recorder,
  context,
  stepTimeout,
}: {
  name: string
  steps: CompiledFeature['scenarios'][number]['steps']
  labels: Array<StepLabel>
  recorder: Recorder
  context: Context
  stepTimeout: number
}): Promise<{result: ScenarioResult; timedOutStep: string | undefined}> {
  const startedAt = new Date().toISOString()
  const startTime = performance.now()
  let assertionCount = 0
  let completedSteps = 0
  let failure: {step: string; error: string} | undefined
  let captureError: string | undefined
  let timedOutStep: string | undefined

  recorder.start(context)

  try {
    for (const [index, step] of steps.entries()) {
      const label = labels[index] ?? {text: '', isAssertion: false}
      recorder.enterStep(index, label.text)

      if (label.isAssertion) {
        assertionCount++
      }

      try {
        await withTimeout(Promise.resolve(step()), stepTimeout)
      } catch (error) {
        failure = {step: label.text, error: errorMessage(error)}
        if (error instanceof StepTimeoutError) {
          timedOutStep = label.text
        }
        try {
          await withTimeout(recorder.capture('failure'), stepTimeout)
        } catch (captureFailure) {
          captureError = errorMessage(captureFailure)
        }
        break
      }
      completedSteps++
    }
  } finally {
    recorder.stop()
  }

  const completed = failure === undefined
  const warnings = [
    ...(assertionCount === 0 ? ['no assertions'] : []),
    ...silentTypingWarnings({
      labels: labels.slice(0, completedSteps),
      recorder,
    }),
  ]

  return {
    timedOutStep,
    result: {
      scenario: name,
      startedAt,
      durationMs: Math.round(performance.now() - startTime),
      completed,
      assertionCount,
      passed: completed && assertionCount > 0,
      ...(failure ? {failedStep: failure.step, error: failure.error} : {}),
      ...(captureError !== undefined ? {captureError} : {}),
      warnings,
      checkpoints: [...recorder.checkpoints],
      events: [...recorder.events],
      console: [...recorder.console],
    },
  }
}

/**
 * A timed-out step keeps running in the page after Racetrack stops waiting
 * for it, and would act on the next scenario's editors.
 */
function notRunResult(
  scenario: string,
  abandonedStep: AbandonedStep,
): ScenarioResult {
  const reason = `Not run: '${abandonedStep.step}' in "${abandonedStep.scenario}" timed out and may still be running in the page`

  return {
    scenario,
    startedAt: new Date().toISOString(),
    durationMs: 0,
    completed: false,
    assertionCount: 0,
    passed: false,
    error: reason,
    notRun: reason,
    warnings: [],
    checkpoints: [],
    events: [],
    console: [],
  }
}

/**
 * The shared `{string} is typed` step returns without typing when the editor
 * has no selection, so a typing step that emitted no `operation` event most
 * likely typed nothing.
 */
function silentTypingWarnings({
  labels,
  recorder,
}: {
  labels: Array<StepLabel>
  recorder: Recorder
}): Array<string> {
  return labels.flatMap((label, index) =>
    recorder.typingSteps.has(index) &&
    !recorder.events.some(
      (event) => event.step === index && event.type === 'operation',
    )
      ? [
          `'${label.text}' (step ${index}) emitted no operation events: the typing step does nothing when the editor has no selection`,
        ]
      : [],
  )
}

class StepTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new StepTimeoutError(`Step did not finish within ${timeout}ms`))
      }, timeout)
    }),
  ]).finally(() => {
    clearTimeout(timer)
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
