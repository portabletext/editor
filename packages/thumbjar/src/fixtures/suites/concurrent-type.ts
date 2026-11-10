import {afterAll, describe, expect, test, TestRunner} from 'vitest'
import {
  driverRuns,
  typeOnDevice,
  type TypeOnDeviceOptions,
} from '../../driver.ts'

const options: TypeOnDeviceOptions = {
  keyboard: 'ja',
  url: 'http://localhost:8765/editor.html',
  prefix: 'foo',
  words: [{letters: 'kyou', candidate: '今日'}],
}

// The test Vitest holds as current when each first test calls the driver.
const currentAtCall: Array<string | undefined> = []

describe('concurrent tests', () => {
  let release: () => void
  const released = new Promise<void>((resolve) => {
    release = resolve
  })

  test.concurrent('Scenario: First type resumes while the second test is current', async (context) => {
    await released
    currentAtCall.push(TestRunner.getCurrentTest()?.name)
    const typed = await typeOnDevice(context, options)

    expect(typed.text).toEqual('fooｋ用今日')
  })

  test.concurrent('Scenario: Second type of the concurrent tests', async (context) => {
    release()
    const typed = await typeOnDevice(context, options)

    expect(typed.text).toEqual('fooｋ用今日')
  })
})

describe('sequential tests in concurrent suites', () => {
  let release: () => void
  const released = new Promise<void>((resolve) => {
    release = resolve
  })

  describe.concurrent('first suite', () => {
    test(
      'Scenario: First type resumes while the other suite is current',
      {concurrent: false},
      async (context) => {
        await released
        currentAtCall.push(TestRunner.getCurrentTest()?.name)
        const typed = await typeOnDevice(context, options)

        expect(typed.text).toEqual('fooｋ用今日')
      },
    )
  })

  describe.concurrent('second suite', () => {
    test(
      'Scenario: Second type of the sibling suites',
      {concurrent: false},
      async (context) => {
        release()
        const typed = await typeOnDevice(context, options)

        expect(typed.text).toEqual('fooｋ用今日')
      },
    )
  })
})

afterAll(() => {
  expect(currentAtCall).toEqual([
    'Scenario: Second type of the concurrent tests',
    'Scenario: Second type of the sibling suites',
  ])
  expect(driverRuns).toEqual([
    {
      test: 'Scenario: Second type of the concurrent tests',
      fails: false,
      state: 'complete',
    },
    {
      test: 'Scenario: First type resumes while the second test is current',
      fails: false,
      state: 'complete',
    },
    {
      test: 'Scenario: Second type of the sibling suites',
      fails: false,
      state: 'complete',
    },
    {
      test: 'Scenario: First type resumes while the other suite is current',
      fails: false,
      state: 'complete',
    },
  ])
})
