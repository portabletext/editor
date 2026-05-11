import type {StepKey, StepState} from '../App'
import type {ScenarioResult, StepStatus} from '../runner/browser-runner'
import type {ParsedFeature} from '../runner/feature-parser'

type ScenariosPanelProps = {
  feature: ParsedFeature
  stepStates: Map<StepKey, StepState>
  scenarioResults: Array<ScenarioResult>
}

export function ScenariosPanel({
  feature,
  stepStates,
  scenarioResults,
}: ScenariosPanelProps) {
  const passCount = scenarioResults.filter((r) => r.status === 'pass').length
  const failCount = scenarioResults.filter((r) => r.status === 'fail').length

  return (
    <div className="rt-panel">
      <div className="rt-panel-header">
        <span className="rt-panel-header-title">Track</span>
        <span>
          {feature.scenarios.length} races
          {scenarioResults.length > 0
            ? ` - ${passCount} finished, ${failCount} crashed`
            : ''}
        </span>
      </div>
      <div className="rt-panel-body rt-panel-body--monospace">
        <div className="rt-feature">
          <div className="rt-feature-title">Feature: {feature.name}</div>
          {feature.scenarios.map((scenario, scenarioIndex) => (
            <ScenarioBlock
              // biome-ignore lint/suspicious/noArrayIndexKey: scenario outlines expand to multiple pickles with the same name; the index is the stable identity in racejar's compiled output.
              key={`scenario:${scenarioIndex}:${scenario.name}`}
              scenario={scenario}
              scenarioIndex={scenarioIndex}
              stepStates={stepStates}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type ScenarioBlockProps = {
  scenario: ParsedFeature['scenarios'][number]
  scenarioIndex: number
  stepStates: Map<StepKey, StepState>
}

function ScenarioBlock({
  scenario,
  scenarioIndex,
  stepStates,
}: ScenarioBlockProps) {
  return (
    <div className="rt-scenario">
      <div className="rt-scenario-name">Scenario: {scenario.name}</div>
      {scenario.steps.map((step, stepIndex) => {
        const state = stepStates.get(`${scenarioIndex}-${stepIndex}`)
        const status: StepStatus = state?.status ?? 'idle'
        const className = `rt-step${status === 'fail' ? ' rt-step--fail' : ''}`
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: step order within a scenario is fixed and the array never mutates; the index is the stable identity.
          <div key={stepIndex}>
            <div className={className}>
              <span
                className={`rt-dot rt-dot--${status} rt-step-dot`}
                title={status}
              />
              <span className="rt-step-text">
                {step.keyword} {step.text}
              </span>
            </div>
            {state?.error ? (
              <div className="rt-step-error">{state.error.message}</div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
