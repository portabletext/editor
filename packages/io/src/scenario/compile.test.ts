import {describe, expect, test} from 'vitest'
import listenersFeature from '../../gherkin-spec/listeners.feature?raw'
import loadingAndEmptyFeature from '../../gherkin-spec/loading-and-empty.feature?raw'
import {compileScenarios} from './compile'
import {createWorld} from './world'

describe(compileScenarios.name, () => {
  test('lists every scenario and every row of an outline', () => {
    const {feature, scenarios} = compileScenarios(loadingAndEmptyFeature)

    expect({
      feature,
      names: scenarios.map((scenario) => scenario.name),
    }).toEqual({
      feature: 'Loading and empty',
      names: [
        "An editor that doesn't claim the first load starts ready and empty, and a resync fills it",
        'An editor that claims the first load waits for it',
        'Releasing the claim makes the editor ready and empty',
        'An empty field shows the placeholder, and a lone empty block is real content (the server has no document)',
        'An empty field shows the placeholder, and a lone empty block is real content (the server has no field)',
        'An empty field shows the placeholder, and a lone empty block is real content (the server has an empty list)',
        'An empty field shows the placeholder, and a lone empty block is real content (the server has one empty block "b1")',
        'Emptying the field sends a whole-field unset',
      ],
    })
  })

  test('a scenario runs one step at a time to the end', async () => {
    const [scenario] = compileScenarios(listenersFeature).scenarios
    const world = createWorld()

    for (const step of scenario.steps) {
      await step.run(world)
    }

    expect(
      scenario.steps.map((step) => `${step.keyword} ${step.text}`),
    ).toEqual([
      'Given the document is "B: foo|"',
      'Then Editor A has emitted no change',
      'When "x" is typed',
      'Then Editor A has emitted 1 change',
      'And Editor A has sent batch 1',
      "When the server receives Editor A's batch 1",
      "And Editor A's batch 1 comes back",
      'Then Editor A has emitted 1 change',
      'When the style is set to "h1" in Editor B',
      'Then Editor B has sent batch 1',
      "When the server receives Editor B's batch 1",
      "And Editor A receives Editor B's batch 1",
      'Then Editor A shows "H1: foox|"',
      'And Editor A has emitted 2 changes',
    ])
    expect(world.snapshot().editors?.['Editor A'].screen).toEqual('H1: foox|')
  })

  test('a wrong expectation fails at its own step', async () => {
    const [scenario] = compileScenarios(
      listenersFeature.replace(
        'Then Editor A shows "H1: foox|"',
        'Then Editor A shows "H1: foo|"',
      ),
    ).scenarios
    const world = createWorld()
    const outcomes: Array<string> = []

    for (const step of scenario.steps) {
      try {
        await step.run(world)
        outcomes.push('passed')
      } catch (error) {
        outcomes.push(error instanceof Error ? error.message : String(error))
        break
      }
    }

    expect(outcomes).toEqual([
      ...Array.from({length: 12}, () => 'passed'),
      'What Editor A shows: expected "H1: foo|", got "H1: foox|"',
    ])
  })
})
