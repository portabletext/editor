import {describe, expect, test} from 'vitest'
import concurrentEditsFeature from '../../gherkin-spec/concurrent-edits.feature?raw'
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
        'A load in the first commit makes the editor ready with the content, and no change',
        'An editor nobody loads is ready and empty when its first commit ends, and a resync fills it',
        'A load after the editor is ready is refused',
        'An empty field shows the placeholder, and a lone empty block is real content (the server has no document)',
        'An empty field shows the placeholder, and a lone empty block is real content (the server has no field)',
        'An empty field shows the placeholder, and a lone empty block is real content (the server has an empty list)',
        'An empty field shows the placeholder, and a lone empty block is real content (the server has one empty block "b1")',
        'Emptying the field sends a whole-field unset',
      ],
    })
  })

  test('marks skipped scenarios and reads what a known red one lacks', () => {
    const {scenarios} = compileScenarios(concurrentEditsFeature)

    expect(
      scenarios.map(({name, skipped, knownRed}) => ({name, skipped, knownRed})),
    ).toEqual([
      {
        name: 'Two editors type into the same block at once, and both keep their words',
        skipped: false,
        knownRed: undefined,
      },
      {
        name: 'One editor deletes a repeated word while another types next to it, every screen converges, and the second copy is the one that goes',
        skipped: false,
        knownRed: undefined,
      },
      {
        name: 'A script replaces the whole field while Editor A has unsent typing',
        skipped: false,
        knownRed: undefined,
      },
      {
        name: 'The caret stays with its word while Editor B types before it',
        skipped: true,
        knownRed: "the model doesn't map the caret through remote text changes",
      },
      {
        name: 'Two editors fill an empty field at the same moment and end with two blocks',
        skipped: false,
        knownRed: undefined,
      },
      {
        name: "Editor B deletes the block Editor A is typing into, the deletion lands first, and A's unsent typing is reported as dropped",
        skipped: false,
        knownRed: undefined,
      },
    ])
  })

  test('a known red comment counts only on the line right above the scenario', () => {
    const {scenarios} = compileScenarios(
      [
        'Feature: Free play',
        '  # known red: the first',
        '',
        '  Scenario: foo',
        '    Given the document is "B: foo|"',
        '',
        '  # known red: the second',
        '  Scenario Outline: bar <text>',
        '    Given the document is "B: <text>|"',
        '',
        '    Examples:',
        '      | text |',
        '      | bar  |',
        '      | baz  |',
      ].join('\n'),
    )

    expect(
      scenarios.map(({name, skipped, knownRed}) => ({name, skipped, knownRed})),
    ).toEqual([
      {name: 'foo', skipped: false, knownRed: undefined},
      {name: 'bar bar', skipped: false, knownRed: 'the second'},
      {name: 'bar baz', skipped: false, knownRed: 'the second'},
    ])
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
      "And Editor A's change 1 carries the patches of batch 1",
      "When the server receives Editor A's batch 1",
      "And Editor A's batch 1 comes back",
      'Then Editor A has emitted 1 change',
      'When the style is set to "h1" in Editor B',
      'Then Editor B has sent batch 1',
      "When the server receives Editor B's batch 1",
      "And Editor A receives Editor B's batch 1",
      'Then Editor A shows "H1: foox|"',
      'And Editor A has emitted 2 changes',
      "And Editor A's change 2 carries no patches",
    ])
    expect(world.snapshot().editors?.['Editor A'].screen).toEqual('H1: foox|')
  })

  test('an empty list on the server is checked apart from no field', async () => {
    const {scenarios} = compileScenarios(
      [
        'Feature: Free play',
        '  Scenario: foo',
        '    Given the server has an empty list',
        '    And the editors are in their first commit',
        '    When Editor A is loaded',
        "    And Editor A's first commit ends",
        '    Then the server has an empty list',
        '    And the server has no field',
      ].join('\n'),
    )
    const world = createWorld()
    const outcomes: Array<string> = []

    for (const step of scenarios[0].steps) {
      try {
        await step.run(world)
        outcomes.push('passed')
      } catch (error) {
        outcomes.push(error instanceof Error ? error.message : String(error))
      }
    }

    expect(outcomes).toEqual([
      'passed',
      'passed',
      'passed',
      'passed',
      'passed',
      `The server's field: expected "no field", got "an empty list"`,
    ])
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
      ...Array.from({length: 13}, () => 'passed'),
      'What Editor A shows: expected "H1: foo|", got "H1: foox|"',
    ])
  })
})
