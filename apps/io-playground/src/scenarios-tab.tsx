import {createWorld, type World} from '@portabletext/io'
import {useState} from 'react'
import {features} from './features'
import {runStep} from './gherkin'
import {Button} from './ui'

type StepResult = {status: 'passed'} | {status: 'failed'; message: string}

type ScenarioRun = {
  featureIndex: number
  scenarioIndex: number
  world: World
  results: Array<StepResult>
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
    const publish = (running: boolean) =>
      setRun((current) =>
        current.world === world
          ? {...current, results: [...results], running}
          : current,
      )

    for (const step of scenario.steps.slice(results.length)) {
      try {
        await step.run(world)
        results.push({status: 'passed'})
      } catch (error) {
        results.push({
          status: 'failed',
          message: error instanceof Error ? error.message : String(error),
        })
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
    let deliveryError: string | null = null

    try {
      runStep(world, {keyword: 'When', text})
    } catch (error) {
      deliveryError = `When ${text}: ${error instanceof Error ? error.message : String(error)}`
    }

    setRun((current) =>
      current.world === world ? {...current, deliveryError} : current,
    )

    return deliveryError === null
  }

  return {
    world: run.world,
    featureIndex: run.featureIndex,
    scenarioIndex: run.scenarioIndex,
    scenario,
    results: run.results,
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
    <div className="flex flex-col gap-2">
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
              {feature.scenarios.map((candidate, scenarioIndex) => (
                <option
                  key={scenarioIndex}
                  value={`${featureIndex}:${scenarioIndex}`}
                >
                  {candidate.name}
                </option>
              ))}
            </optgroup>
          ))}
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

      {runner.deliveryError ? (
        <p className="font-mono text-xs text-red-700">{runner.deliveryError}</p>
      ) : null}

      <ol className="flex flex-col font-mono text-xs">
        {scenario.steps.map((step, index) => {
          const result = results[index]
          const current = index === results.length && !finished

          return (
            <li
              key={index}
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
              <span className="font-semibold">{step.keyword}</span> {step.text}
              {result?.status === 'failed' ? (
                <div className="pl-4 whitespace-pre-wrap">{result.message}</div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
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
    running: false,
    deliveryError: null,
  }
}
