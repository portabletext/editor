import {mkdtempSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, test, vi} from 'vitest'
import {cdpEval} from '../device/cdp.ts'
import {Device} from '../device/u2.ts'
import {closeChrome, dumpFailure, typeInChrome} from './typing.ts'
import {prepareEnglishKeyboard, warmEnglishKeyboard} from './warmup.ts'

vi.mock(import('../device/cdp.ts'), () => ({cdpEval: vi.fn()}))
vi.mock(import('../device/u2.ts'))
vi.mock('node:crypto', () => ({randomUUID: () => 'warmup-run'}))
vi.mock(import('./typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  typeInChrome: vi.fn(),
  closeChrome: vi.fn(),
  dumpFailure: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe(prepareEnglishKeyboard.name, () => {
  test('creates a new device for each connection and closes both', async () => {
    const out = mkdtempSync(join(tmpdir(), 'thumbjar-warmup-'))
    const first = {name: 'first', close: vi.fn(() => Promise.resolve())}
    const second = {name: 'second', close: vi.fn(() => Promise.resolve())}
    vi.mocked(Device.connect)
      .mockResolvedValueOnce(first as never)
      .mockResolvedValueOnce(second as never)
    const connected: unknown[] = []
    vi.mocked(typeInChrome).mockImplementationOnce(
      async (_name, _options, connect) => {
        connected.push(await connect(), await connect())
        return {
          text: 'Hello ',
          picked: ['space'],
          compositionstart: 1,
          nested: 0,
          compositionstartPerWord: [1],
        }
      },
    )
    await prepareEnglishKeyboard(out, 'http://localhost/app')
    expect(connected).toEqual([first, second])
    expect(first.close.mock.calls).toEqual([[]])
    expect(second.close.mock.calls).toEqual([[]])
  })

  test('does not dump a second time when the first dump throws', async () => {
    const out = mkdtempSync(join(tmpdir(), 'thumbjar-warmup-'))
    vi.mocked(typeInChrome).mockResolvedValueOnce({
      text: 'Helo ',
      picked: ['space'],
      compositionstart: 1,
      nested: 0,
      compositionstartPerWord: [1],
    })
    vi.mocked(dumpFailure).mockRejectedValueOnce(new Error('dump failed'))
    await expect(
      prepareEnglishKeyboard(out, 'http://localhost/app'),
    ).rejects.toThrow('dump failed')
    expect(vi.mocked(dumpFailure).mock.calls.map(([name]) => name)).toEqual([
      'en-warmup-1',
    ])
  })

  test('types into the configured page with the normal driver, and persists retries and passes to artifacts and the summary', async () => {
    const out = mkdtempSync(join(tmpdir(), 'thumbjar-warmup-'))
    const summary = join(out, 'summary.md')
    vi.stubEnv('GITHUB_STEP_SUMMARY', summary)
    const close = vi.fn(() => Promise.resolve())
    vi.mocked(Device.connect).mockResolvedValue({close} as never)
    const calls: unknown[] = []
    let chromeStopped = false
    vi.mocked(closeChrome).mockImplementation(() => {
      chromeStopped = true
      return Promise.resolve()
    })
    vi.mocked(typeInChrome).mockImplementation(
      async (name, options, connect) => {
        expect(chromeStopped).toEqual(true)
        chromeStopped = false
        await connect()
        calls.push([name, options])
        return {
          text: name.endsWith('1') ? 'Helo\u00a0' : 'Hello\u00a0',
          picked: ['space'],
          compositionstart: 1,
          nested: 0,
          compositionstartPerWord: [1],
        }
      },
    )
    await prepareEnglishKeyboard(out, 'http://localhost:8765/custom?foo=bar')
    expect(calls).toEqual([
      [
        'en-warmup-1',
        {
          url: 'http://localhost:8765/custom?foo=bar&thumbjar=english-warmup',
          keyboard: 'en',
          prefix: '',
          words: [{letters: 'hello'}],
        },
      ],
      [
        'en-warmup-2',
        {
          url: 'http://localhost:8765/custom?foo=bar&thumbjar=english-warmup',
          keyboard: 'en',
          prefix: '',
          words: [{letters: 'hello'}],
        },
      ],
    ])
    expect(readFileSync(join(out, 'en-warmup.jsonl'), 'utf8')).toEqual(
      '{"run":"warmup-run","attempt":1,"text":"Helo\\u00a0","outcome":"retry"}\n{"run":"warmup-run","attempt":2,"text":"Hello\\u00a0","outcome":"pass"}\n',
    )
    expect(readFileSync(summary, 'utf8')).toEqual(
      '- English Gboard warm-up, run warmup-run, attempt 1: got `Helo` and a non-breaking space, retrying\n- English Gboard warm-up, run warmup-run, attempt 2: got `Hello` and a non-breaking space, passed\n',
    )
    expect(chromeStopped).toEqual(true)
    expect(vi.mocked(cdpEval).mock.calls).toEqual([])
    expect(vi.mocked(closeChrome).mock.calls.at(-1)).toEqual([])
    expect(vi.mocked(dumpFailure).mock.calls.map(([name]) => name)).toEqual([
      'en-warmup-1',
    ])
    expect(close.mock.calls).toEqual([[], []])
  })
  test('names a trailing space in the summary and keeps it in the JSONL', async () => {
    const out = mkdtempSync(join(tmpdir(), 'thumbjar-warmup-'))
    const summary = join(out, 'summary.md')
    vi.stubEnv('GITHUB_STEP_SUMMARY', summary)
    vi.mocked(typeInChrome).mockResolvedValueOnce({
      text: 'hello ',
      picked: ['space'],
      compositionstart: 1,
      nested: 0,
      compositionstartPerWord: [1],
    })
    await prepareEnglishKeyboard(out, 'http://localhost/app')
    expect(readFileSync(summary, 'utf8')).toEqual(
      '- English Gboard warm-up, run warmup-run, attempt 1: got `hello` and a trailing space, passed\n',
    )
    expect(readFileSync(join(out, 'en-warmup.jsonl'), 'utf8')).toEqual(
      '{"run":"warmup-run","attempt":1,"text":"hello ","outcome":"pass"}\n',
    )
  })

  test('reports no text in the summary before retrying', async () => {
    const out = mkdtempSync(join(tmpdir(), 'thumbjar-warmup-'))
    const summary = join(out, 'summary.md')
    vi.stubEnv('GITHUB_STEP_SUMMARY', summary)
    vi.mocked(typeInChrome)
      .mockResolvedValueOnce({
        text: null,
        picked: ['space'],
        compositionstart: 1,
        nested: 0,
        compositionstartPerWord: [1],
      })
      .mockResolvedValueOnce({
        text: 'hello',
        picked: ['space'],
        compositionstart: 1,
        nested: 0,
        compositionstartPerWord: [1],
      })
    await prepareEnglishKeyboard(out, 'http://localhost/app')
    expect(readFileSync(summary, 'utf8')).toEqual(
      '- English Gboard warm-up, run warmup-run, attempt 1: got no text, retrying\n- English Gboard warm-up, run warmup-run, attempt 2: got `hello`, passed\n',
    )
  })

  test('saves failure diagnostics and closes Chrome after a driver fault', async () => {
    const out = mkdtempSync(join(tmpdir(), 'thumbjar-warmup-'))
    vi.mocked(typeInChrome).mockRejectedValueOnce(new Error('device offline'))
    await expect(
      prepareEnglishKeyboard(out, 'http://localhost/app'),
    ).rejects.toThrow('device offline')
    expect(vi.mocked(dumpFailure).mock.calls.map(([name]) => name)).toEqual([
      'en-warmup-1',
    ])
    expect(vi.mocked(closeChrome).mock.calls.at(-1)).toEqual([])
  })
})

describe(warmEnglishKeyboard.name, () => {
  test('accepts lowercase with a trailing space', async () => {
    const record = vi.fn()
    await warmEnglishKeyboard({
      type: () => Promise.resolve('hello '),
      record,
      clear: async () => {},
      dismiss: async () => {},
    })
    expect(record.mock.calls).toEqual([
      [{attempt: 1, text: 'hello ', outcome: 'pass'}],
    ])
  })

  test('accepts lowercase without a trailing space', async () => {
    const record = vi.fn()
    await warmEnglishKeyboard({
      type: () => Promise.resolve('hello'),
      record,
      clear: async () => {},
      dismiss: async () => {},
    })
    expect(record.mock.calls).toEqual([
      [{attempt: 1, text: 'hello', outcome: 'pass'}],
    ])
  })

  test('accepts lowercase with a non-breaking space', async () => {
    const record = vi.fn()
    await warmEnglishKeyboard({
      type: () => Promise.resolve('hello\u00a0'),
      record,
      clear: async () => {},
      dismiss: async () => {},
    })
    expect(record.mock.calls).toEqual([
      [{attempt: 1, text: 'hello\u00a0', outcome: 'pass'}],
    ])
  })

  test('accepts a dropped trailing space', async () => {
    const record = vi.fn()
    await warmEnglishKeyboard({
      type: () => Promise.resolve('Hello'),
      record,
      clear: async () => {},
      dismiss: async () => {},
    })
    expect(record.mock.calls).toEqual([
      [{attempt: 1, text: 'Hello', outcome: 'pass'}],
    ])
  })

  test('accepts the recorded non-breaking space', async () => {
    const record = vi.fn()
    await warmEnglishKeyboard({
      type: () => Promise.resolve('Hello\u00a0'),
      record,
      clear: async () => {},
      dismiss: async () => {},
    })
    expect(record.mock.calls).toEqual([
      [{attempt: 1, text: 'Hello\u00a0', outcome: 'pass'}],
    ])
  })

  test('records a clean word and Space, clears and dismisses without another attempt', async () => {
    const calls: unknown[] = []
    await warmEnglishKeyboard({
      type: (attempt) => {
        calls.push(['type', attempt])
        return Promise.resolve('Hello ')
      },
      record: (outcome) => {
        calls.push(outcome)
      },
      clear: () => {
        calls.push('clear')
        return Promise.resolve()
      },
      dismiss: () => {
        calls.push('dismiss')
        return Promise.resolve()
      },
    })
    expect(calls).toEqual([
      ['type', 1],
      {attempt: 1, text: 'Hello ', outcome: 'pass'},
      'clear',
      'dismiss',
    ])
  })

  test('records wrong text before retrying a closed page', async () => {
    const calls: unknown[] = []
    const texts = ['Helo ', 'Hell ', 'Hello ']
    await warmEnglishKeyboard({
      type: (attempt) => {
        calls.push(['type', attempt])
        return Promise.resolve(texts[attempt - 1]!)
      },
      record: (outcome) => {
        calls.push(outcome)
      },
      clear: () => {
        calls.push('clear')
        return Promise.resolve()
      },
      dismiss: () => {
        calls.push('dismiss')
        return Promise.resolve()
      },
    })
    expect(calls).toEqual([
      ['type', 1],
      {attempt: 1, text: 'Helo ', outcome: 'retry'},
      'clear',
      ['type', 2],
      {attempt: 2, text: 'Hell ', outcome: 'retry'},
      'clear',
      ['type', 3],
      {attempt: 3, text: 'Hello ', outcome: 'pass'},
      'clear',
      'dismiss',
    ])
  })

  test('fails after three wrong texts, preserving each outcome and dismissing', async () => {
    const calls: unknown[] = []
    await expect(
      warmEnglishKeyboard({
        type: () => Promise.resolve(null),
        record: (outcome) => {
          calls.push(outcome)
        },
        clear: () => {
          calls.push('clear')
          return Promise.resolve()
        },
        dismiss: () => {
          calls.push('dismiss')
          return Promise.resolve()
        },
      }),
    ).rejects.toThrow(
      'English Gboard warm-up: none of 3 attempts gave "Hello", ignoring case, see en-warmup.jsonl',
    )
    expect(calls).toEqual([
      {attempt: 1, text: null, outcome: 'retry'},
      'clear',
      {attempt: 2, text: null, outcome: 'retry'},
      'clear',
      {attempt: 3, text: null, outcome: 'fail'},
      'clear',
      'dismiss',
    ])
  })

  test('dismisses and propagates a driver fault without retrying it', async () => {
    const calls: unknown[] = []
    await expect(
      warmEnglishKeyboard({
        type: () => {
          calls.push('type')
          return Promise.reject(new Error('device offline'))
        },
        record: (outcome) => {
          calls.push(outcome)
        },
        clear: () => {
          calls.push('clear')
          return Promise.resolve()
        },
        dismiss: () => {
          calls.push('dismiss')
          return Promise.resolve()
        },
      }),
    ).rejects.toThrow('device offline')
    expect(calls).toEqual(['type', 'dismiss'])
  })
})
