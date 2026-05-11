import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {expect, vi} from 'vitest'
import {
  MentionPickerPlugin,
  resetMatchesCallCount,
} from '../plugins/mention-picker'
import {
  attachLocators,
  mentionPickerSteps,
  type MentionPickerContext,
} from '../plugins/mention-picker.steps'
import {
  runFeature,
  type ScenarioResult,
  type StepResult,
} from '../runner/browser-runner'
import {cleanup} from '../runner/vitest-browser-react-shim'

type RunnerPanelProps = {
  featureText: string
  isRunning: boolean
  scenarioResults: Array<ScenarioResult>
  scenarioCount: number
  onRunStart: () => void
  onRunEnd: () => void
  onStep: (result: StepResult) => void
  onScenarioComplete: (result: ScenarioResult) => void
}

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link'}],
})

export function RunnerPanel({
  featureText,
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
        featureText,
        parameterTypes,
        stepDefinitions: [...stepDefinitions, ...mentionPickerSteps],
        hooks: [
          Before(async (context: MentionPickerContext) => {
            resetMatchesCallCount()
            const {editor, locator} = await createTestEditor({
              children: <MentionPickerPlugin />,
              schemaDefinition,
            })
            context.editor = editor
            context.locator = locator
            attachLocators(context)
            await vi.waitFor(() =>
              expect.element(context.keywordLocator).toBeInTheDocument(),
            )
            await vi.waitFor(() =>
              expect.element(context.matchesLocator).toBeInTheDocument(),
            )
          }),
        ],
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
        <span className="rt-panel-header-title">Runner</span>
        <button
          type="button"
          className="rt-button rt-button--primary"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : 'Run scenarios'}
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
              ? `${passCount}/${scenarioCount} pass`
              : `${passCount}/${scenarioCount} pass, ${failCount} failed`}
          </div>
        ) : (
          <div className="rt-summary">
            {scenarioCount} scenarios ready. Press Run scenarios.
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
