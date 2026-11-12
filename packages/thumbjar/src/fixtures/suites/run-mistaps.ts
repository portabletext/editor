import {expect, test, vi} from 'vitest'
import {driverRuns, runOnDevice, typeOnDevice} from '../../driver.ts'
import * as typing from '../../gboard/typing.ts'

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

test('Scenario: en retries a Space-committed Dash mistap', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.recordEvents = true
  gboardDevice.typedOverrides = ['_']
  const typing = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', text: '-'}],
  })
  await vi.runAllTimersAsync()
  expect((await typing).text).toEqual('- ')
  expect(driverRuns.at(-1)?.mistapRetries).toEqual(1)
  expect(gboardDevice.attempt).toEqual(2)
})

test('Scenario: a Space tap with non-space insertText cannot classify a symbol', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.recordEvents = true
  gboardDevice.typedOverrides = ['_']
  gboardDevice.beforeinputEvents = [
    {type: 'beforeinput', inputType: 'insertText', data: '_'},
    {type: 'beforeinput', inputType: 'insertText', data: '　'},
  ]
  const typing = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', text: '-'}],
  })
  await vi.runAllTimersAsync()
  expect((await typing).text).toEqual('_ ')
  expect(driverRuns.at(-1)?.mistapRetries).toEqual(undefined)
  expect(gboardDevice.attempt).toEqual(1)
})

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

for (const [name, data, text] of [
  ['an editor that rewrites - as _ keeps its text', '-', '_ '],
  ['an editor that rewrites - as ~ keeps its text', '-', '~ '],
  ['an unrecorded ~ keeps the editor text', '~', '~ '],
]) {
  test(`Scenario: ${name}`, async (context) => {
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

test('Scenario: a timeout after mistap classification keeps its reason', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.recordEvents = true
  gboardDevice.typedOverrides = ['_']
  const deadline = new AbortController()
  const dump = vi.spyOn(typing, 'dumpFailure').mockImplementationOnce(() => {
    deadline.abort(new Error('test deadline'))
    return Promise.resolve()
  })
  context.onTestFinished(() => dump.mockRestore())
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', text: '-', commit: 'none'}],
    },
  ).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running
  expect({
    state: driverRuns.at(-1)?.state,
    reason: driverRuns.at(-1)?.reason,
    attempt: gboardDevice.attempt,
    mistapRetries: driverRuns.at(-1)?.mistapRetries,
  }).toEqual({
    state: 'inconclusive',
    reason: "mistap: key 'Dash' typed '_' instead of '-'",
    attempt: 1,
    mistapRetries: undefined,
  })
})

test('Scenario: a timeout during a mistap restart keeps its reason', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.recordEvents = true
  gboardDevice.typedOverrides = ['_']
  gboardDevice.adbAnswers = [{match: /force-stop/, answer: 'hangs'}]
  const deadline = new AbortController()
  const running = runOnDevice(
    {...context, signal: deadline.signal},
    {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', text: '-', commit: 'none'}],
    },
  ).catch((error: unknown) => error)
  await vi.waitFor(
    () => {
      expect(gboardDevice.calls.includes('force-stop chrome')).toEqual(true)
    },
    {timeout: 15_000},
  )
  deadline.abort(new Error('test deadline'))
  await vi.runAllTimersAsync()
  await running
  expect({
    state: driverRuns.at(-1)?.state,
    reason: driverRuns.at(-1)?.reason,
    attempt: gboardDevice.attempt,
    mistapRetries: driverRuns.at(-1)?.mistapRetries,
  }).toEqual({
    state: 'inconclusive',
    reason: "mistap: key 'Dash' typed '_' instead of '-'",
    attempt: 1,
    mistapRetries: 1,
  })
})

test('Scenario: a Dash mistap restart with an offline force-stop ends device offline', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.recordEvents = true
  gboardDevice.typedOverrides = ['_']
  gboardDevice.adbAnswers = [
    {
      match: /force-stop/,
      answer: {stdout: '', stderr: 'error: device offline\n', code: 1},
    },
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', text: '-', commit: 'none'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running

  expect({
    state: driverRuns.at(-1)?.state,
    reason: driverRuns.at(-1)?.reason,
    mistapRetries: driverRuns.at(-1)?.mistapRetries,
    attempt: gboardDevice.attempt,
  }).toEqual({
    state: 'device-offline',
    reason:
      'adb lost the device, so it was not retried: adb shell am force-stop com.android.chrome exited with 1: error: device offline',
    mistapRetries: 1,
    attempt: 1,
  })
})

test('Scenario: a Dash mistap restart whose old Chrome never stops ends inconclusive', async (context) => {
  vi.useFakeTimers()
  gboardDevice.reset()
  gboardDevice.recordEvents = true
  gboardDevice.typedOverrides = ['_']
  gboardDevice.forceStopStops = false
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', text: '-', commit: 'none'}],
  }).catch((error: unknown) => error)
  await vi.runAllTimersAsync()
  await running

  expect({
    state: driverRuns.at(-1)?.state,
    reason: driverRuns.at(-1)?.reason,
    mistapRetries: driverRuns.at(-1)?.mistapRetries,
    attempt: gboardDevice.attempt,
  }).toEqual({
    state: 'inconclusive',
    reason: expect.stringMatching(
      /^the restart before the retry did not show a fresh Chrome: the old Chrome still ran \d+s after the force-stop, old pid 100, new pid 100$/,
    ),
    mistapRetries: 1,
    attempt: 1,
  })
})
