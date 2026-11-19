import {beforeEach, expect, test, vi} from 'vitest'
import {sleep} from '../device/util.ts'
import {driverRuns, runOnDevice} from '../driver.ts'
import type {PageEvent, Step} from '../steps.ts'
import {runOnSimulator} from './typing.ts'

const device = vi.hoisted(() => ({
  remote: vi.fn(),
  candidate: vi.fn(),
  events: [] as PageEvent[],
  text: '',
  taps: [] as string[],
  dropped: false,
  keyboard: 'ja',
}))

vi.mock('vitest', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vitest')>()),
  inject: () => 'ios',
}))

vi.mock('../device/util.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../device/util.ts')>()),
  sleep: vi.fn(),
}))

vi.mock('webdriverio', () => ({remote: device.remote}))

beforeEach(() => {
  device.events = [{type: 'focus'}]
  device.text = ''
  device.taps = []
  device.candidate.mockReset().mockReturnValue(false)
  vi.mocked(sleep).mockClear()
  device.dropped = false
  device.keyboard = 'ja'
  const element = (selector: unknown) => ({
    waitForExist: () => {},
    getAttribute: () => (device.keyboard === 'ja' ? '削除' : 'Delete'),
    isExisting: device.candidate,
    click: () => {
      if (typeof selector !== 'string' || !selector.includes('name ==')) {
        return
      }
      const name = JSON.parse(
        selector.slice(selector.lastIndexOf(' ') + 1),
      ) as string
      device.taps.push(name)
      if (
        device.dropped &&
        (device.taps.length === 1 || device.taps.at(-2) === 'space')
      ) {
        return
      }
      device.text += name
      device.events.push({type: name === '今日' ? 'compositionend' : 'input'})
    },
  })
  device.remote.mockResolvedValue({
    getContexts: () => ['WEBVIEW_1'],
    switchContext: () => {},
    url: () => {},
    execute: (script: unknown) =>
      typeof script === 'string'
        ? JSON.stringify(
            script.includes('focused:')
              ? {
                  state: {
                    text: device.text,
                    events: device.events,
                    state: {foo: 'bar'},
                  },
                  selection: {
                    text: device.text,
                    anchor: device.text.length,
                    focus: device.text.length,
                  },
                  focused: true,
                }
              : {text: device.text, events: device.events},
          )
        : true,
    $: element,
    $$: () => ({map: () => ['きょう']}),
    pause: () => {
      vi.advanceTimersByTime(100)
    },
    waitUntil: async (predicate: () => Promise<boolean>) => {
      if (!(await predicate())) {
        throw new Error('condition not met')
      }
    },
    getPageSource: () => '<page/>',
    saveScreenshot: () => {},
    deleteSession: () => {},
  })
})

test('skips the whole case before opening a session when a later step is unsupported', async (context) => {
  for (const step of [
    {type: 'enter'},
    {type: 'backspace'},
    {type: 'page', action: 'foo'},
    {type: 'compose', text: 'foo'},
    {type: 'compose', letters: 'foo', commit: 'none'},
    {type: 'compose', letters: 'F'},
    {type: 'compose', letters: 'foo', commit: {candidate: 'bar'}},
  ] satisfies Step[]) {
    const skip = vi.fn((reason?: string | boolean) => {
      throw new Error(String(reason))
    })
    await expect(
      runOnDevice(
        {...context, skip},
        {
          url: 'http://localhost:8765/editor.html',
          keyboard: 'en',
          prefix: '',
          steps: [{type: 'compose', letters: 'foo', commit: 'space'}, step],
        },
      ),
    ).rejects.toThrow('step 2')
    expect(skip.mock.calls.length).toEqual(1)
  }
  expect(device.remote.mock.calls).toEqual([])
})

test('a missing Japanese candidate fails the step and skips later steps without tapping Space', async (context) => {
  await expect(
    runOnSimulator(context, {
      url: 'http://localhost:8765/editor.html',
      keyboard: 'ja',
      prefix: '',
      steps: [
        {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
        {type: 'compose', letters: 'foo'},
      ],
    }),
  ).rejects.toThrow(
    "iOS keyboard did not offer the candidate '今日' in step 1, candidates ['きょう']",
  )
  expect(device.taps).toEqual(['k', 'y', 'o', 'u'])
  expect(device.candidate.mock.calls).toEqual([[], [], [], [], [], [], []])
  expect(vi.mocked(sleep).mock.calls).toEqual([
    [0.5],
    [0.5],
    [0.5],
    [0.5],
    [0.5],
    [0.5],
  ])
})

test('waits for a required Japanese candidate that appears on the second lookup', async (context) => {
  device.candidate.mockReturnValueOnce(false).mockReturnValue(true)
  const run = await runOnSimulator(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })
  expect(run).toEqual({
    text: 'kyou今日',
    selection: {anchor: 6, focus: 6},
    state: {foo: 'bar'},
    events: [
      {type: 'input'},
      {type: 'input'},
      {type: 'input'},
      {type: 'input'},
      {type: 'compositionend'},
    ],
    steps: [
      {
        type: 'compose',
        status: 'done',
        textAfter: 'kyou今日',
        selectionAfter: {anchor: 6, focus: 6},
        focusedAfter: true,
        stateAfter: {foo: 'bar'},
        events: [
          {type: 'input'},
          {type: 'input'},
          {type: 'input'},
          {type: 'input'},
          {type: 'compositionend'},
        ],
        keys: ['k', 'y', 'o', 'u', '今日'],
      },
    ],
  })
  expect(device.candidate.mock.calls).toEqual([[], []])
  expect(vi.mocked(sleep).mock.calls).toEqual([[0.5]])
  expect(device.taps).toEqual(['k', 'y', 'o', 'u', '今日'])
})

test('stops waiting for a required Japanese candidate when the signal aborts', async (context) => {
  const controller = new AbortController()
  const reason = new Error('candidate wait aborted')
  device.candidate.mockReturnValueOnce(false).mockReturnValue(true)
  vi.mocked(sleep).mockImplementationOnce(() => {
    controller.abort(reason)
    return Promise.resolve()
  })

  await expect(
    runOnSimulator(
      {...context, signal: controller.signal},
      {
        url: 'http://localhost:8765/editor.html',
        keyboard: 'ja',
        prefix: '',
        steps: [
          {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
        ],
      },
    ).catch((error: Error) => error.cause),
  ).resolves.toEqual(reason)
  expect.soft(device.candidate.mock.calls).toEqual([[]])
  expect.soft(device.taps).toEqual(['k', 'y', 'o', 'u'])
})

test('records page boundaries and retries the first tap of each compose step', async (context) => {
  vi.useFakeTimers()
  try {
    device.dropped = true
    device.keyboard = 'en'
    const run = await runOnSimulator(context, {
      url: 'http://localhost:8765/editor.html',
      keyboard: 'en',
      prefix: '',
      steps: [
        {type: 'compose', letters: 'foo', commit: 'space'},
        {type: 'compose', letters: 'foo', commit: 'space'},
      ],
    })
    expect(device.candidate.mock.calls).toEqual([])
    expect(vi.mocked(sleep).mock.calls).toEqual([])
    expect(run).toEqual({
      text: 'foospacefoospace',
      selection: {anchor: 16, focus: 16},
      state: {foo: 'bar'},
      events: [
        {type: 'input'},
        {type: 'input'},
        {type: 'input'},
        {type: 'input'},
        {type: 'input'},
        {type: 'input'},
        {type: 'input'},
        {type: 'input'},
      ],
      steps: [
        {
          type: 'compose',
          status: 'done',
          textAfter: 'foospace',
          selectionAfter: {anchor: 8, focus: 8},
          focusedAfter: true,
          stateAfter: {foo: 'bar'},
          events: [
            {type: 'input'},
            {type: 'input'},
            {type: 'input'},
            {type: 'input'},
          ],
          keys: ['f', 'f', 'o', 'o', 'space'],
        },
        {
          type: 'compose',
          status: 'done',
          textAfter: 'foospacefoospace',
          selectionAfter: {anchor: 16, focus: 16},
          focusedAfter: true,
          stateAfter: {foo: 'bar'},
          events: [
            {type: 'input'},
            {type: 'input'},
            {type: 'input'},
            {type: 'input'},
          ],
          keys: ['f', 'f', 'o', 'o', 'space'],
        },
      ],
    })
  } finally {
    vi.useRealTimers()
  }
})

test('an iOS session fault before a typing tap ends faulted', async (context) => {
  device.remote.mockRejectedValueOnce(new Error('session failed'))
  await expect(
    runOnDevice(context, {
      url: 'http://localhost:8765/editor.html',
      keyboard: 'en',
      prefix: '',
      steps: [{type: 'compose', letters: 'foo'}],
    }),
  ).rejects.toThrow('session failed')
  expect(driverRuns.at(-1)?.state).toEqual('faulted')
  expect(device.taps).toEqual([])
})

test('an iOS fault after a typing tap ends inconclusive', async (context) => {
  await expect(
    runOnDevice(context, {
      url: 'http://localhost:8765/editor.html',
      keyboard: 'ja',
      prefix: '',
      steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
    }),
  ).rejects.toThrow('did not offer the candidate')
  expect(driverRuns.at(-1)?.state).toEqual('inconclusive')
  expect(device.taps).toEqual(['k', 'y', 'o', 'u'])
})
