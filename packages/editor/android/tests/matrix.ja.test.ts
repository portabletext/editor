/* oxlint-disable no-restricted-globals -- The probe artifacts use `JSON.stringify` on thumbjar records. */
import {mkdir, writeFile} from 'node:fs/promises'
import {runOnDevice} from 'thumbjar'
import {test} from 'vitest'

test('Scenario: empty-word on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'ja',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-empty-word-plain.json', directory),
    JSON.stringify({case: 'empty-word', page: 'plain', keyboard: 'ja', run}),
  )
})

test('Scenario: empty-word on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'ja',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-empty-word-prevent.json', directory),
    JSON.stringify({case: 'empty-word', page: 'prevent', keyboard: 'ja', run}),
  )
})

test('Scenario: empty-word on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-empty-word-editor.json', directory),
    JSON.stringify({case: 'empty-word', page: 'editor', keyboard: 'ja', run}),
  )
})

test('Scenario: after-text-word on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'ja',
    prefix: 'x',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-after-text-word-plain.json', directory),
    JSON.stringify({
      case: 'after-text-word',
      page: 'plain',
      keyboard: 'ja',
      run,
    }),
  )
})

test('Scenario: after-text-word on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'ja',
    prefix: 'x',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-after-text-word-prevent.json', directory),
    JSON.stringify({
      case: 'after-text-word',
      page: 'prevent',
      keyboard: 'ja',
      run,
    }),
  )
})

test('Scenario: after-text-word on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: 'x',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-after-text-word-editor.json', directory),
    JSON.stringify({
      case: 'after-text-word',
      page: 'editor',
      keyboard: 'ja',
      run,
    }),
  )
})

test('Scenario: compose-backspace on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'ja',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: 'none'},
      {type: 'backspace', times: 2},
      {type: 'compose', letters: 'ka', commit: 'space'},
    ],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-compose-backspace-plain.json', directory),
    JSON.stringify({
      case: 'compose-backspace',
      page: 'plain',
      keyboard: 'ja',
      run,
    }),
  )
})

test('Scenario: compose-backspace on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'ja',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: 'none'},
      {type: 'backspace', times: 2},
      {type: 'compose', letters: 'ka', commit: 'space'},
    ],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-compose-backspace-prevent.json', directory),
    JSON.stringify({
      case: 'compose-backspace',
      page: 'prevent',
      keyboard: 'ja',
      run,
    }),
  )
})

test('Scenario: compose-backspace on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: 'none'},
      {type: 'backspace', times: 2},
      {type: 'compose', letters: 'ka', commit: 'space'},
    ],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('ja-compose-backspace-editor.json', directory),
    JSON.stringify({
      case: 'compose-backspace',
      page: 'editor',
      keyboard: 'ja',
      run,
    }),
  )
})
