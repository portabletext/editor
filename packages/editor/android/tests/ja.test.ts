import {runOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'

test('Scenario: Typing kyou twice into a plain contenteditable', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/plain.html',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
      {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
    ],
  })

  expect(run.text).toEqual('今日今日')
  let nested = 0
  let open = false
  for (const event of run.events) {
    if (event.type === 'compositionstart') {
      if (open) {
        nested += 1
      }
      open = true
    } else if (event.type === 'compositionend') {
      open = false
    }
  }
  expect({
    nested,
    compositionstartPerWord: run.steps.map(
      (step) =>
        step.events.filter((event) => event.type === 'compositionstart').length,
    ),
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})

test('Scenario: Typing kyou twice into an empty block', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
      {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
    ],
  })

  expect(run.text).toEqual('今日今日')
  let nested = 0
  let open = false
  for (const event of run.events) {
    if (event.type === 'compositionstart') {
      if (open) {
        nested += 1
      }
      open = true
    } else if (event.type === 'compositionend') {
      open = false
    }
  }
  expect({
    nested,
    compositionstartPerWord: run.steps.map(
      (step) =>
        step.events.filter((event) => event.type === 'compositionstart').length,
    ),
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})

test('Scenario: Typing kyou twice after existing text', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x',
    steps: [
      {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
      {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
    ],
  })

  expect(run.text).toEqual('x今日今日')
  let nested = 0
  let open = false
  for (const event of run.events) {
    if (event.type === 'compositionstart') {
      if (open) {
        nested += 1
      }
      open = true
    } else if (event.type === 'compositionend') {
      open = false
    }
  }
  expect({
    nested,
    compositionstartPerWord: run.steps.map(
      (step) =>
        step.events.filter((event) => event.type === 'compositionstart').length,
    ),
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})
