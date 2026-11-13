import {runOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'
import {toDeviceTextspec} from '../scripts/gherkin.ts'

test('Scenario: Pressing Enter in a block that starts with a dash and space', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: '- ',
    steps: [{type: 'enter'}],
  })

  expect({
    text: run.text,
    state: toDeviceTextspec(run.state),
    steps: run.steps.map((step) => ({
      type: step.type,
      status: step.status,
      textAfter: step.textAfter,
      stateAfter: toDeviceTextspec(step.stateAfter),
      selectionAfter: step.selectionAfter,
      focusedAfter: step.focusedAfter,
      insertParagraphs: step.events.filter(
        (event) =>
          event.type === 'beforeinput' && event.inputType === 'insertParagraph',
      ).length,
    })),
  }).toEqual({
    text: '- \n',
    state: 'B: - \nB: |',
    steps: [
      {
        type: 'enter',
        status: 'done',
        textAfter: '- \n',
        stateAfter: 'B: - \nB: |',
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        insertParagraphs: 1,
      },
    ],
  })
})

test('Scenario: Pressing Enter after typing a dash and space on the symbol layout', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: '',
    steps: [{type: 'compose', text: '- ', commit: 'none'}, {type: 'enter'}],
  })

  expect({
    text: run.text,
    state: toDeviceTextspec(run.state),
    steps: run.steps.map((step) => ({
      type: step.type,
      status: step.status,
      textAfter: step.textAfter,
      stateAfter: toDeviceTextspec(step.stateAfter),
      selectionAfter: step.selectionAfter,
      focusedAfter: step.focusedAfter,
      insertParagraphs: step.events.filter(
        (event) =>
          event.type === 'beforeinput' && event.inputType === 'insertParagraph',
      ).length,
    })),
  }).toEqual({
    text: '- \n',
    state: 'B: - \nB: |',
    steps: [
      {
        type: 'compose',
        status: 'done',
        textAfter: '- ',
        stateAfter: 'B: - |',
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        insertParagraphs: 0,
      },
      {
        type: 'enter',
        status: 'done',
        textAfter: '- \n',
        stateAfter: 'B: - \nB: |',
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        insertParagraphs: 1,
      },
    ],
  })
})
