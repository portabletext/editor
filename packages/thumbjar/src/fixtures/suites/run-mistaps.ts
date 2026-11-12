import {expect, test, vi} from 'vitest'
import {driverRuns, runOnDevice, typeOnDevice} from '../../driver.ts'

for (const keyboard of ['en', 'ja'] as const) {
  test(`Scenario: ${keyboard} retries a symbol popup`, async (context) => {
    vi.useFakeTimers()
    gboardDevice.reset()
    gboardDevice.recordEvents = true
    gboardDevice.keyboard = keyboard
    gboardDevice.typedOverrides = [keyboard === 'en' ? '_' : '—']
    const typing = runOnDevice(context, {
      keyboard,
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', text: '- ', commit: 'none'}],
    })
    await vi.runAllTimersAsync()
    expect((await typing).text).toEqual('- ')
    expect(driverRuns.at(-1)?.mistapRetries).toEqual(1)
    expect(gboardDevice.attempt).toEqual(2)
    expect(gboardDevice.nextPid).toEqual(102)
  })
}

test('Scenario: retries a digit', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.recordEvents = true
  gboardDevice.typedOverrides = ['7']
  const typing = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', letters: 'a', commit: 'none'}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()
  const result = await typing
  expect(typeof result === 'string' ? result : result.text).toEqual('a')
  expect(driverRuns.at(-1)?.mistapRetries).toEqual(1)
})

for (const typed of ['_', '7']) {
  test(`Scenario: repeated ${typed} is inconclusive`, async (context) => {
    vi.useFakeTimers()
    gboardDevice.reset()
    gboardDevice.recordEvents = true
    gboardDevice.typedOverrides = [typed, typed]
    const typing = runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', text: '-', commit: 'none'}],
    }).catch((error: Error) => error.message)
    await vi.runAllTimersAsync()
    expect(typeof (await typing)).toEqual('string')
    expect(gboardDevice.attempt).toEqual(2)
    expect(gboardDevice.nextPid).toEqual(102)
    expect(driverRuns.at(-1)?.state).toEqual('inconclusive')
    expect(driverRuns.at(-1)?.reason).toEqual(
      typed === '7'
        ? "mistap: digit 7 in typed text '7' that neither the prefix nor the letters hold"
        : "mistap: key 'Dash' typed '_' instead of '-'",
    )
  })
}

for (const [data, text] of [
  ['-', '_ '],
  ['-', '~ '],
  ['~', '~ '],
]) {
  test(`Scenario: editor result ${data} to ${text} is returned once`, async (context) => {
    vi.useFakeTimers()
    gboardDevice.reset()
    gboardDevice.recordEvents = true
    gboardDevice.typedOverrides = [data]
    gboardDevice.rewrittenText = text
    const typing = runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', text: '- ', commit: 'none'}],
    })
    await vi.runAllTimersAsync()
    expect((await typing).text).toEqual(text)
    expect(gboardDevice.attempt).toEqual(1)
    expect(driverRuns.at(-1)?.mistapRetries).toEqual(undefined)
  })
}

for (const [name, events] of [
  ['missing', []],
  ['extra', ['_', ' ', ' ']],
  ['reordered', [' ', '_']],
  ['unmatched following tap', ['_', '-']],
  ['multiple characters', ['_ ', ' ']],
] as const) {
  test(`Scenario: ${name} beforeinputs cannot classify a symbol`, async (context) => {
    vi.useFakeTimers()
    gboardDevice.reset()
    gboardDevice.recordEvents = true
    gboardDevice.typedOverrides = ['_']
    gboardDevice.beforeinputEvents = events.map((data) => ({
      type: 'beforeinput',
      inputType: 'insertText',
      data,
    }))
    const typing = runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', text: '- ', commit: 'none'}],
    })
    await vi.runAllTimersAsync()
    expect((await typing).text).toEqual('_ ')
    expect(gboardDevice.attempt).toEqual(1)
    expect(driverRuns.at(-1)?.mistapRetries).toEqual(undefined)
  })
}

test('Scenario: a page exception takes precedence over a symbol mistap', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.recordEvents = true
  gboardDevice.typedOverrides = ['_']
  gboardDevice.pageExceptionReads = [2]
  const typing = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', text: '-', commit: 'none'}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()
  expect(await typing).toEqual(expect.stringContaining('getSnapshot failed'))
  expect(driverRuns.at(-1)?.state).toEqual('page-exception')
  expect(driverRuns.at(-1)?.mistapRetries).toEqual(undefined)
  expect(gboardDevice.attempt).toEqual(1)
})

test('Scenario: typeOnDevice counts a digit mistap retry', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.typedOverrides = ['7']
  const typing = typeOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [{letters: 'a'}],
  })
  await vi.runAllTimersAsync()
  expect((await typing).text).toEqual('a ')
  expect(driverRuns.at(-1)?.mistapRetries).toEqual(1)
  expect(gboardDevice.attempt).toEqual(2)
})
