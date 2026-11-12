import {beforeEach, expect, test, vi} from 'vitest'
import {driverRuns} from '../../driver.ts'
import {openOnDevice} from '../../session.ts'

beforeEach(() => {
  globalThis.gboardDevice.reset()
  vi.useFakeTimers()
})

test('Scenario: Session setup before input retries in a fresh Chrome', async (context) => {
  globalThis.gboardDevice.lostReads = [1]
  const opening = openOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
  })
  await vi.waitFor(
    () =>
      expect({
        attempt: globalThis.gboardDevice.attempt,
        reads: globalThis.gboardDevice.reads,
      }).toEqual({attempt: 2, reads: 2}),
    {timeout: 60_000},
  )
  const session = await opening
  expect((await session.read()).textAfter).toEqual('')
  const closing = session.close()
  await vi.runAllTimersAsync()
  await closing
  expect(globalThis.gboardDevice.attempt).toEqual(2)
  expect(driverRuns.at(-1)?.state).toEqual('complete')
})

test('Scenario: A session fault in step five after input in step two does not replay', async (context) => {
  const opening = openOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
  })
  await vi.waitFor(() => expect(globalThis.gboardDevice.reads).toEqual(2), {
    timeout: 60_000,
  })
  const session = await opening
  await session.page('select')
  const second = session.enter()
  await vi.waitFor(() => expect(globalThis.gboardDevice.reads).toEqual(4), {
    timeout: 60_000,
  })
  expect((await second).textAfter).toEqual('\n')
  await session.page('select')
  await session.read()
  globalThis.gboardDevice.pageActionErrors = [new Error('page socket lost')]
  const fifth = session.page('select').catch(String)
  await vi.runAllTimersAsync()
  expect(await fifth).toEqual(
    [
      'Error: page socket lost',
      'Steps:',
      "  1. read: done, textAfter '', keys none",
      "  2. page: done, textAfter '', keys none",
      "  3. enter: done, textAfter '\\n', keys Enter",
      "  4. page: done, textAfter '\\n', keys none",
      "  5. read: done, textAfter '\\n', keys none",
      "  6. page: failed (Error: page socket lost), textAfter '\\n', keys none",
    ].join('\n'),
  )
  expect(globalThis.gboardDevice.attempt).toEqual(1)
  expect(driverRuns.at(-1)?.state).toEqual('inconclusive')
  await expect(session.close()).rejects.toThrow('page socket lost')
})

test('Scenario: A session replays page commands before input but not author assertions', async (context) => {
  const opening = openOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
  })
  await vi.waitFor(() => expect(globalThis.gboardDevice.reads).toEqual(2), {
    timeout: 60_000,
  })
  const session = await opening
  let assertions = 0
  expect((await session.page('first')).textAfter).toEqual('')
  assertions += 1
  globalThis.gboardDevice.pageActionErrors = [new Error('page socket lost')]
  const second = session.page('second')
  await vi.waitFor(
    () =>
      expect({
        attempt: globalThis.gboardDevice.attempt,
        reads: globalThis.gboardDevice.reads,
      }).toEqual({attempt: 2, reads: 4}),
    {timeout: 60_000},
  )
  await second
  expect({assertions, actions: globalThis.gboardDevice.pageActions}).toEqual({
    assertions: 1,
    actions: [
      'window.__action("first", null)',
      'window.__action("second", null)',
      'window.__action("first", null)',
      'window.__action("second", null)',
    ],
  })
  const closing = session.close()
  await vi.runAllTimersAsync()
  await closing
})
