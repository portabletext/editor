import {useMemo, useState} from 'react'
import {garage} from './garage'
import {EnginePanel} from './panels/EnginePanel'
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
  const [entryId, setEntryId] = useState(garage[0]!.id)
  const entry = garage.find((e) => e.id === entryId) ?? garage[0]!

  const feature = useMemo(() => parseFeature(entry.featureText), [entry])

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

  function handleEntryChange(nextId: string) {
    if (isRunning) {
      return
    }
    setEntryId(nextId)
    resetRun()
  }

  return (
    <div className="rt-app">
      <header className="rt-header">
        <span className="rt-header-title">Racetrack</span>
        <label className="rt-entry-picker">
          <span className="rt-entry-picker-label">Now racing:</span>
          <select
            className="rt-entry-picker-select"
            value={entry.id}
            disabled={isRunning}
            onChange={(event) => handleEntryChange(event.target.value)}
          >
            {garage.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <span className="rt-entry-picker-description">
            {entry.description}
          </span>
        </label>
      </header>
      <div className="rt-panels">
        <ScenariosPanel
          feature={feature}
          stepStates={stepStates}
          scenarioResults={scenarioResults}
        />
        <PlaygroundPanel entry={entry} />
        <EnginePanel entry={entry} />
        <RunnerPanel
          entry={entry}
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
    </div>
  )
}
