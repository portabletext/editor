import {useMemo, useState} from 'react'
import mentionPickerFeature from './features/mention-picker.feature?raw'
import {PlaygroundPanel} from './panels/PlaygroundPanel'
import {RunnerPanel} from './panels/RunnerPanel'
import {ScenariosPanel} from './panels/ScenariosPanel'
import type {ScenarioResult, StepStatus} from './runner/browser-runner'
import {parseFeature} from './runner/feature-parser'

export type StepKey = `${number}-${number}`

export type StepState = {
  status: StepStatus
  error?: Error
}

export function App() {
  const feature = useMemo(() => parseFeature(mentionPickerFeature), [])

  const [stepStates, setStepStates] = useState<Map<StepKey, StepState>>(
    () => new Map(),
  )
  const [scenarioResults, setScenarioResults] = useState<Array<ScenarioResult>>(
    [],
  )
  const [isRunning, setIsRunning] = useState(false)

  function resetRun() {
    setStepStates(new Map())
    setScenarioResults([])
  }

  function updateStep(
    scenarioIndex: number,
    stepIndex: number,
    state: StepState,
  ) {
    setStepStates((prev) => {
      const next = new Map(prev)
      next.set(`${scenarioIndex}-${stepIndex}`, state)
      return next
    })
  }

  return (
    <div className="rt-app">
      <ScenariosPanel
        feature={feature}
        stepStates={stepStates}
        scenarioResults={scenarioResults}
      />
      <PlaygroundPanel />
      <RunnerPanel
        featureText={mentionPickerFeature}
        isRunning={isRunning}
        scenarioResults={scenarioResults}
        scenarioCount={feature.scenarios.length}
        onRunStart={() => {
          resetRun()
          setIsRunning(true)
        }}
        onRunEnd={() => setIsRunning(false)}
        onStep={(result) => {
          updateStep(result.scenarioIndex, result.stepIndex, {
            status: result.status,
            error: result.error,
          })
        }}
        onScenarioComplete={(result) => {
          setScenarioResults((prev) => [...prev, result])
        }}
      />
    </div>
  )
}
