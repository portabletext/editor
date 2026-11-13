/* oxlint-disable no-restricted-globals -- The probe artifacts use `JSON.stringify` on thumbjar records. */
import {mkdir, writeFile} from 'node:fs/promises'
import {runOnDevice} from 'thumbjar'
import {test} from 'vitest'

test('Scenario: empty-word on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'en',
    prefix: '',
    steps: [{type: 'compose', letters: 'hello', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-empty-word-plain.json', directory),
    JSON.stringify({case: 'empty-word', page: 'plain', keyboard: 'en', run}),
  )
})

test('Scenario: empty-word on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'en',
    prefix: '',
    steps: [{type: 'compose', letters: 'hello', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-empty-word-prevent.json', directory),
    JSON.stringify({case: 'empty-word', page: 'prevent', keyboard: 'en', run}),
  )
})

test('Scenario: empty-word on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: '',
    steps: [{type: 'compose', letters: 'hello', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-empty-word-editor.json', directory),
    JSON.stringify({case: 'empty-word', page: 'editor', keyboard: 'en', run}),
  )
})

test('Scenario: after-text-word on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'en',
    prefix: 'foo ',
    steps: [{type: 'compose', letters: 'bar', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-after-text-word-plain.json', directory),
    JSON.stringify({
      case: 'after-text-word',
      page: 'plain',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: after-text-word on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'en',
    prefix: 'foo ',
    steps: [{type: 'compose', letters: 'bar', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-after-text-word-prevent.json', directory),
    JSON.stringify({
      case: 'after-text-word',
      page: 'prevent',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: after-text-word on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: 'foo ',
    steps: [{type: 'compose', letters: 'bar', commit: 'space'}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-after-text-word-editor.json', directory),
    JSON.stringify({
      case: 'after-text-word',
      page: 'editor',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: backspace-in-word on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'en',
    prefix: 'foo',
    steps: [{type: 'backspace', times: 1}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-backspace-in-word-plain.json', directory),
    JSON.stringify({
      case: 'backspace-in-word',
      page: 'plain',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: backspace-in-word on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'en',
    prefix: 'foo',
    steps: [{type: 'backspace', times: 1}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-backspace-in-word-prevent.json', directory),
    JSON.stringify({
      case: 'backspace-in-word',
      page: 'prevent',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: backspace-in-word on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: 'foo',
    steps: [{type: 'backspace', times: 1}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-backspace-in-word-editor.json', directory),
    JSON.stringify({
      case: 'backspace-in-word',
      page: 'editor',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: backspace-word on plain', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/plain.html',
    keyboard: 'en',
    prefix: 'foo bar',
    steps: [{type: 'backspace', times: 4}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-backspace-word-plain.json', directory),
    JSON.stringify({
      case: 'backspace-word',
      page: 'plain',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: backspace-word on prevent', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/prevent.html',
    keyboard: 'en',
    prefix: 'foo bar',
    steps: [{type: 'backspace', times: 4}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-backspace-word-prevent.json', directory),
    JSON.stringify({
      case: 'backspace-word',
      page: 'prevent',
      keyboard: 'en',
      run,
    }),
  )
})

test('Scenario: backspace-word on editor', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'en',
    prefix: 'foo bar',
    steps: [{type: 'backspace', times: 4}],
  })

  const directory = new URL('../out/matrix/', import.meta.url)
  await mkdir(directory, {recursive: true})
  await writeFile(
    new URL('en-backspace-word-editor.json', directory),
    JSON.stringify({
      case: 'backspace-word',
      page: 'editor',
      keyboard: 'en',
      run,
    }),
  )
})
