import {createWorld, type World} from '@portabletext/io'
import {useEffect, useRef, useState, type ReactNode} from 'react'
import {features} from './features'
import {runStep} from './gherkin'
import {narrateStep, type NarrationEntry} from './narration'
import {NarrationLog} from './narration-log'
import {Button} from './ui'

type StepResult = {status: 'passed'} | {status: 'failed'; message: string}

type ScenarioRun = {
  featureIndex: number
  scenarioIndex: number
  world: World
  results: Array<StepResult>
  narration: Array<NarrationEntry>
  running: boolean
  deliveryError: string | null
}

export function useScenarioRunner() {
  const [run, setRun] = useState<ScenarioRun>(() =>
    freshRun({featureIndex: 0, scenarioIndex: 0}),
  )
  const scenario = features[run.featureIndex].scenarios[run.scenarioIndex]
  const failed = run.results.at(-1)?.status === 'failed'
  const finished = failed || run.results.length === scenario.steps.length

  async function runSteps({all}: {all: boolean}) {
    if (run.running || finished) {
      return
    }

    setRun((current) => ({...current, running: true}))

    const {world} = run
    const results = [...run.results]
    const narration = [...run.narration]
    const actions = actionSteps(scenario.steps)
    const publish = (running: boolean) =>
      setRun((current) =>
        current.world === world
          ? {
              ...current,
              results: [...results],
              narration: [...narration],
              running,
            }
          : current,
      )

    for (const step of scenario.steps.slice(results.length)) {
      const before = world.snapshot()
      const narrateNow = () =>
        narration.push(
          ...narrateStep({
            step: `${step.keyword} ${step.text}`,
            isAction: actions[results.length - 1] ?? false,
            before,
            after: world.snapshot(),
          }),
        )

      try {
        await step.run(world)
        results.push({status: 'passed'})
        narrateNow()
      } catch (error) {
        results.push({
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
        })
        narrateNow()
        break
      }

      if (!all) {
        break
      }

      publish(true)
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }

    publish(false)
  }

  function deliver(text: string): boolean {
    const {world} = run
    const before = world.snapshot()
    let deliveryError: string | null = null

    try {
      runStep(world, {keyword: 'When', text})
    } catch (error) {
      deliveryError = `When ${text}: ${error instanceof Error ? error.message : String(error)}`
    }

    const entries = narrateStep({
      step: `When ${text}`,
      isAction: true,
      before,
      after: world.snapshot(),
    })

    setRun((current) =>
      current.world === world
        ? {
            ...current,
            deliveryError,
            narration: [...current.narration, ...entries],
          }
        : current,
    )

    return deliveryError === null
  }

  return {
    world: run.world,
    featureIndex: run.featureIndex,
    scenarioIndex: run.scenarioIndex,
    scenario,
    results: run.results,
    narration: run.narration,
    running: run.running,
    finished,
    deliveryError: run.deliveryError,
    deliver,
    select: (selection: {featureIndex: number; scenarioIndex: number}) =>
      setRun(freshRun(selection)),
    reset: () =>
      setRun((current) =>
        freshRun({
          featureIndex: current.featureIndex,
          scenarioIndex: current.scenarioIndex,
        }),
      ),
    nextStep: () => runSteps({all: false}),
    runAll: () => runSteps({all: true}),
  }
}

export function ScenariosTab({
  runner,
}: {
  runner: ReturnType<typeof useScenarioRunner>
}) {
  const {scenario, results, running, finished} = runner

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="max-w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm"
          value={`${runner.featureIndex}:${runner.scenarioIndex}`}
          disabled={running}
          onChange={(event) => {
            const [featureIndex, scenarioIndex] = event.target.value
              .split(':')
              .map(Number)
            runner.select({featureIndex, scenarioIndex})
          }}
        >
          {features.map((feature, featureIndex) => (
            <optgroup key={feature.feature} label={feature.feature}>
              {feature.scenarios.map((candidate, scenarioIndex) =>
                candidate.knownRed === undefined ? (
                  <option
                    key={scenarioIndex}
                    value={`${featureIndex}:${scenarioIndex}`}
                  >
                    {candidate.name}
                  </option>
                ) : null,
              )}
            </optgroup>
          ))}
          {knownRedScenarios.length > 0 ? (
            <optgroup label="Known red">
              {knownRedScenarios.map(({featureIndex, scenarioIndex, name}) => (
                <option
                  key={`${featureIndex}:${scenarioIndex}`}
                  value={`${featureIndex}:${scenarioIndex}`}
                >
                  {name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <Button onClick={runner.nextStep} disabled={running || finished}>
          next step
        </Button>
        <Button onClick={runner.runAll} disabled={running || finished}>
          run all
        </Button>
        <Button onClick={runner.reset} disabled={running}>
          reset
        </Button>
        {finished ? (
          results.at(-1)?.status === 'failed' ? (
            <span className="text-sm text-red-700">failed</span>
          ) : (
            <span className="text-sm text-green-700">passed</span>
          )
        ) : null}
      </div>

      {scenario.knownRed ? (
        <p className="text-sm text-red-700">
          Expected to fail: {scenario.knownRed}
        </p>
      ) : null}

      {runner.deliveryError ? (
        <p className="font-mono text-xs text-red-700">{runner.deliveryError}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <ol className="min-h-0 overflow-auto font-mono text-xs">
          {scenario.steps.map((step, index) => {
            const result = results[index]
            const current = index === results.length && !finished

            return (
              <StepItem
                key={index}
                current={current}
                className={`rounded px-2 py-0.5 ${
                  result?.status === 'passed'
                    ? 'bg-green-50 text-green-800'
                    : result?.status === 'failed'
                      ? 'bg-red-50 text-red-800'
                      : current
                        ? 'bg-yellow-100'
                        : 'text-gray-600'
                }`}
              >
                <span className="font-semibold">{step.keyword}</span>{' '}
                {step.text}
                {result?.status === 'failed' ? (
                  <div className="pl-4 whitespace-pre-wrap">
                    {result.message}
                  </div>
                ) : null}
              </StepItem>
            )
          })}
        </ol>

        <div className="min-h-0 overflow-auto">
          <NarrationLog entries={runner.narration} />
        </div>
      </div>
    </div>
  )
}

const knownRedScenarios = features.flatMap((feature, featureIndex) =>
  feature.scenarios.flatMap((candidate, scenarioIndex) =>
    candidate.knownRed === undefined
      ? []
      : [{featureIndex, scenarioIndex, name: candidate.name}],
  ),
)

function StepItem({
  current,
  className,
  children,
}: {
  current: boolean
  className: string
  children: ReactNode
}) {
  const element = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (current) {
      element.current?.scrollIntoView({block: 'nearest'})
    }
  }, [current])

  return (
    <li ref={element} className={className}>
      {children}
    </li>
  )
}

function freshRun(selection: {
  featureIndex: number
  scenarioIndex: number
}): ScenarioRun {
  return {
    ...selection,
    world: createWorld(),
    results: [],
    narration: [],
    running: false,
    deliveryError: null,
  }
}

/**
 * Whether each step is an action: `When`, or an `And` or `But` that
 * continues one.
 */
function actionSteps(steps: Array<{keyword: string}>): Array<boolean> {
  let lastPrimaryKeyword = ''

  return steps.map((step) => {
    if (step.keyword !== 'And' && step.keyword !== 'But') {
      lastPrimaryKeyword = step.keyword
    }

    return lastPrimaryKeyword === 'When'
  })
}
