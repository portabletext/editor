/* oxlint-disable no-restricted-globals -- The probe artifacts use `JSON.stringify` on thumbjar records. */
import {mkdir, writeFile} from 'node:fs/promises'
import {runOnDevice} from 'thumbjar'
import {test} from 'vitest'

test('Scenario: backspace-after-commit on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'ja',
    prefix: '今日',
    steps: [{type: 'backspace', times: 1}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-backspace-after-commit-plain.json', directory),
    JSON.stringify({
      case: 'backspace-after-commit',
      page: 'plain',
      keyboard: 'ja',
      run,
    }),
  )
})

test('Scenario: backspace-after-commit on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'ja',
    prefix: '今日',
    steps: [{type: 'backspace', times: 1}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-backspace-after-commit-prevent.json', directory),
    JSON.stringify({
      case: 'backspace-after-commit',
      page: 'prevent',
      keyboard: 'ja',
      run,
    }),
  )
})

test('Scenario: backspace-after-commit on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: '今日',
    steps: [{type: 'backspace', times: 1}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-backspace-after-commit-editor.json', directory),
    JSON.stringify({
      case: 'backspace-after-commit',
      page: 'editor',
      keyboard: 'ja',
      run,
    }),
  )
})

test('Scenario: enter-end on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'ja',
    prefix: 'x',
    steps: [{type: 'enter'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-enter-end-plain.json', directory),
    JSON.stringify({case: 'enter-end', page: 'plain', keyboard: 'ja', run}),
  )
})

test('Scenario: enter-end on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'ja',
    prefix: 'x',
    steps: [{type: 'enter'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-enter-end-prevent.json', directory),
    JSON.stringify({case: 'enter-end', page: 'prevent', keyboard: 'ja', run}),
  )
})

test('Scenario: enter-end on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: 'x',
    steps: [{type: 'enter'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-enter-end-editor.json', directory),
    JSON.stringify({case: 'enter-end', page: 'editor', keyboard: 'ja', run}),
  )
})
