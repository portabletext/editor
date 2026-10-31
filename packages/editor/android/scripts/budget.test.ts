import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, test} from 'vitest'
import {createVitest} from 'vitest/node'
import {DEVICE_TEST_FILE_SECONDS, DEVICE_TESTS_PER_FILE} from './budget.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))

describe('DEVICE_TEST_FILE_SECONDS', () => {
  test('is the timeout `run-on-device.sh` runs the device tests under', () => {
    const script = readFileSync(`${root}scripts/run-on-device.sh`, 'utf8')
    const testStage = script.match(
      /^timeout -k 10 (\S+) pnpm exec vitest run --project device /m,
    )
    const readBudget = script.match(/^tests_seconds=.*$/m)

    expect(testStage?.[1]).toEqual('"$tests_seconds"')
    expect(
      Number(
        execFileSync('bash', ['-c', `${readBudget?.[0]}; echo $tests_seconds`], {
          cwd: root,
          encoding: 'utf8',
        }),
      ),
    ).toEqual(DEVICE_TEST_FILE_SECONDS)
  })
})

describe('DEVICE_TESTS_PER_FILE', () => {
  test('no device test file declares more tests', async () => {
    const vitest = await createVitest('test', {
      root,
      config: false,
      watch: false,
      include: ['tests/*.test.ts'],
      reporters: [],
    })
    try {
      const {testModules} = await vitest.collect()
      const overBudget = testModules
        .map((testModule) => ({
          file: testModule.relativeModuleId,
          tests: [...testModule.children.allTests()].length,
        }))
        .filter(({tests}) => tests > DEVICE_TESTS_PER_FILE)

      expect(testModules.length).toBeGreaterThan(0)
      expect(overBudget).toEqual([])
    } finally {
      await vitest.close()
    }
  }, 30_000)
})
