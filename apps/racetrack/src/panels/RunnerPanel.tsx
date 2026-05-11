import {stepDefinitions} from '@portabletext/editor/test/vitest'
import type {GarageEntry} from '../garage'
import {
  runFeature,
  type ScenarioResult,
  type StepResult,
} from '../runner/browser-runner'
import {cleanup} from '../runner/vitest-browser-react-shim'

type RunnerPanelProps = {
  entry: GarageEntry
  isRunning: boolean
  scenarioResults: Array<ScenarioResult>
  scenarioCount: number
  onRunStart: () => void
  onRunEnd: () => void
  onStep: (result: StepResult) => void
  onScenarioComplete: (result: ScenarioResult) => void
}

export function RunnerPanel({
  entry,
  isRunning,
  scenarioResults,
  scenarioCount,
  onRunStart,
  onRunEnd,
  onStep,
  onScenarioComplete,
}: RunnerPanelProps) {
  async function handleRun() {
    onRunStart()

    try {
      await runFeature({
        featureText: entry.featureText,
        parameterTypes: entry.parameterTypes,
        stepDefinitions: entry.buildStepDefinitions({
          editorStepDefinitions: stepDefinitions,
        }),
        hooks: entry.buildHooks(),
        onStep,
        onScenarioComplete,
        betweenScenarios: async () => {
          await cleanup()
        },
      })
    } finally {
      onRunEnd()
    }
  }

  const passCount = scenarioResults.filter((r) => r.status === 'pass').length
  const failCount = scenarioResults.filter((r) => r.status === 'fail').length
  const ranCount = scenarioResults.length

  return (
    <div className="rt-panel">
      <div className="rt-panel-header">
        <span className="rt-panel-header-title">Race control</span>
        <button
          type="button"
          className="rt-button rt-button--primary"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? 'Racing...' : 'Start race'}
        </button>
      </div>
      <div className="rt-panel-body">
        {ranCount > 0 ? (
          <div
            className={`rt-summary ${
              failCount === 0 ? 'rt-summary--pass' : 'rt-summary--fail'
            }`}
          >
            {failCount === 0
              ? `${passCount}/${scenarioCount} finished`
              : `${passCount}/${scenarioCount} finished, ${failCount} crashed`}
          </div>
        ) : (
          <div className="rt-summary">
            {scenarioCount} races on the grid. Press start.
          </div>
        )}
        <div className="rt-runner-target">
          <div className="rt-runner-target-label">Test target</div>
          <div data-racetrack-test-target />
        </div>
      </div>
    </div>
  )
}
