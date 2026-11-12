/* oxlint-disable no-restricted-globals -- The probe artifacts use `JSON.stringify` on thumbjar records. */
import {mkdir, writeFile} from 'node:fs/promises'
import {runOnDevice} from 'thumbjar'
import {test} from 'vitest'

test('Scenario: enter-end on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'en',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-enter-end-plain.json', directory),
    JSON.stringify({case: 'enter-end', page: 'plain', keyboard: 'en', run}),
  )
})

test('Scenario: enter-end on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'en',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-enter-end-prevent.json', directory),
    JSON.stringify({case: 'enter-end', page: 'prevent', keyboard: 'en', run}),
  )
})

test('Scenario: enter-end on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-enter-end-editor.json', directory),
    JSON.stringify({case: 'enter-end', page: 'editor', keyboard: 'en', run}),
  )
})

test('Scenario: autocorrect on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'en',
    prefix: '',
    steps: [{type: 'compose', letters: 'teh', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-autocorrect-plain.json', directory),
    JSON.stringify({case: 'autocorrect', page: 'plain', keyboard: 'en', run}),
  )
})

test('Scenario: autocorrect on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'en',
    prefix: '',
    steps: [{type: 'compose', letters: 'teh', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-autocorrect-prevent.json', directory),
    JSON.stringify({case: 'autocorrect', page: 'prevent', keyboard: 'en', run}),
  )
})

test('Scenario: autocorrect on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: '',
    steps: [{type: 'compose', letters: 'teh', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-autocorrect-editor.json', directory),
    JSON.stringify({case: 'autocorrect', page: 'editor', keyboard: 'en', run}),
  )
})

test('Scenario: compose-then-backspace on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'en',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'hello', commit: 'none'},
      {type: 'backspace', times: 2},
      {type: 'compose', letters: 'p', commit: 'space'},
    ],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-compose-then-backspace-plain.json', directory),
    JSON.stringify({
      case: 'compose-then-backspace',
      page: 'plain',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: compose-then-backspace on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'en',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'hello', commit: 'none'},
      {type: 'backspace', times: 2},
      {type: 'compose', letters: 'p', commit: 'space'},
    ],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-compose-then-backspace-prevent.json', directory),
    JSON.stringify({
      case: 'compose-then-backspace',
      page: 'prevent',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: compose-then-backspace on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'hello', commit: 'none'},
      {type: 'backspace', times: 2},
      {type: 'compose', letters: 'p', commit: 'space'},
    ],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-compose-then-backspace-editor.json', directory),
    JSON.stringify({
      case: 'compose-then-backspace',
      page: 'editor',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: over-bold on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'en',
    prefix: 'foo',
    steps: [{type: 'compose', letters: 'baz', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-over-bold-plain.json', directory),
    JSON.stringify({case: 'over-bold', page: 'plain', keyboard: 'en', run}),
  )
})

test('Scenario: over-bold on editor-bold', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor-bold.html?bold=bar',
    keyboard: 'en',
    prefix: 'foo',
    steps: [{type: 'compose', letters: 'baz', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-over-bold-editor-bold.json', directory),
    JSON.stringify({
      case: 'over-bold',
      page: 'editor-bold',
      keyboard: 'en',
      run,
    }),
  )
})
