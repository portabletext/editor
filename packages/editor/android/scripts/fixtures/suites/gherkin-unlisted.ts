import {Feature} from 'racejar/vitest'
import {deviceDefinitions} from '../../gherkin.ts'
import {editorState} from '../editor-state.ts'

Feature({
  featureText: `Feature: unlisted boundaries
Scenario: Pressing Enter when selecting the entire content
Given the editor state is "B: foo"
Then the editor state is "B: foo|"
When "bar" is inserted
Then the editor state is "B: bar|"`,
  expectFail: () => true,
  ...deviceDefinitions(
    (_context, options) =>
      Promise.resolve({
        text: '',
        selection: null,
        events: [],
        steps: options.steps.map((step) => ({
          type: step.type,
          status: 'done',
          stateAfter: editorState('B: baz|'),
          textAfter: '',
          selectionAfter: null,
          focusedAfter: true,
          events: [],
          keys: [],
        })),
      }),
    [
      {
        scenario: 'Pressing Enter when selecting the entire content',
        boundary: 1,
        actual: 'B: baz|',
      },
    ],
  ),
})
