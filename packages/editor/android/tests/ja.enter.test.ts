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
    state: run.state,
    steps: run.steps.map((step) => ({
      type: step.type,
      status: step.status,
      textAfter: step.textAfter,
      stateAfter: step.stateAfter,
      selectionAfter: step.selectionAfter,
      focusedAfter: step.focusedAfter,
      insertParagraphs: step.events.filter(
        (event) =>
          event.type === 'beforeinput' && event.inputType === 'insertParagraph',
      ).length,
    })),
  }).toEqual({
    text: '- \n',
    state: {
      value: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '- ', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
        backward: false,
      },
    },
    steps: [
      {
        type: 'enter',
        status: 'done',
        textAfter: '- \n',
        stateAfter: {
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: '- ', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
          ],
          selection: {
            anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
            focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
            backward: false,
          },
        },
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
    state: run.state,
    steps: run.steps.map((step) => ({
      type: step.type,
      status: step.status,
      textAfter: step.textAfter,
      stateAfter: step.stateAfter,
      selectionAfter: step.selectionAfter,
      focusedAfter: step.focusedAfter,
      insertParagraphs: step.events.filter(
        (event) =>
          event.type === 'beforeinput' && event.inputType === 'insertParagraph',
      ).length,
    })),
  }).toEqual({
    text: '- \n',
    state: {
      value: [
        {
          _type: 'block',
          _key: 'k0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: '- ', marks: []}],
        },
        {
          _type: 'block',
          _key: 'k4',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
        },
      ],
      selection: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
        backward: false,
      },
    },
    steps: [
      {
        type: 'compose',
        status: 'done',
        textAfter: '- ',
        stateAfter: {
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: '- ', marks: []}],
            },
          ],
          selection: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
            backward: false,
          },
        },
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        insertParagraphs: 0,
      },
      {
        type: 'enter',
        status: 'done',
        textAfter: '- \n',
        stateAfter: {
          value: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: '- ', marks: []}],
            },
            {
              _type: 'block',
              _key: 'k4',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
            },
          ],
          selection: {
            anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
            focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 0},
            backward: false,
          },
        },
        selectionAfter: {anchor: 2, focus: 2},
        focusedAfter: true,
        insertParagraphs: 1,
      },
    ],
  })
})
