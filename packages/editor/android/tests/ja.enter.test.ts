import {runOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'

test('Scenario: Pressing Enter in a block that starts with a dash and space', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: '- ',
    steps: [{type: 'enter'}],
  })

  expect({
    text: run.text,
    steps: run.steps.map((step) => ({
      type: step.type,
      status: step.status,
      textAfter: step.textAfter,
      selectionAfter: step.selectionAfter,
      focusedAfter: step.focusedAfter,
      insertParagraphs: step.events.filter(
        (event) =>
          event.type === 'beforeinput' && event.inputType === 'insertParagraph',
      ).length,
    })),
  }).toEqual({
    text: '- \n',
    steps: [
      {
        type: 'enter',
        status: 'done',
        textAfter: '- \n',
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
    keyboard: 'ja',
    prefix: '',
    steps: [{type: 'compose', text: '- ', commit: 'none'}, {type: 'enter'}],
  })

  expect({
    text: run.text,
    steps: run.steps.map((step) => ({
      type: step.type,
      status: step.status,
      textAfter: step.textAfter,
      selectionAfter: step.selectionAfter,
      focusedAfter: step.focusedAfter,
      insertParagraphs: step.events.filter(
        (event) =>
          event.type === 'beforeinput' && event.inputType === 'insertParagraph',
      ).length,
    })),
  }).toEqual({
    text: '- \n',
    steps: [
      {
        type: 'compose',
        status: 'done',
        textAfter: '- ',
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        insertParagraphs: 0,
      },
      {
        type: 'enter',
        status: 'done',
        textAfter: '- \n',
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        insertParagraphs: 1,
      },
    ],
  })
})
