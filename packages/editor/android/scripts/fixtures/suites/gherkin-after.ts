import {Feature} from 'racejar/vitest'
import {expect} from 'vitest'
import {deviceDefinitions} from '../../gherkin.ts'

Feature({
  featureText: `Feature: After assertions
Scenario: wrong intermediate state
Given one editor
And the editor state is "B: foo"
Then the editor state is "B: foo|"
When "bar" is inserted
Then the editor state is "B: bar|"
Scenario: unsupported hardware
Given one editor
When "{ArrowRight}" is pressed`,
  ...deviceDefinitions((context) => {
    expect(context.signal.aborted).toEqual(false)
    expect(context.task.name).toEqual('wrong intermediate state')
    return Promise.resolve({
      text: 'bar',
      selection: null,
      events: [],
      state: 'B: bar|',
      steps: [
        {
          type: 'page',
          status: 'done',
          stateAfter: 'B: baz|',
          textAfter: 'baz',
          selectionAfter: null,
          focusedAfter: true,
          events: [],
          keys: [],
        },
        {
          type: 'page',
          status: 'done',
          stateAfter: 'B: bar|',
          textAfter: 'bar',
          selectionAfter: null,
          focusedAfter: true,
          events: [],
          keys: [],
        },
      ],
    })
  }),
})
