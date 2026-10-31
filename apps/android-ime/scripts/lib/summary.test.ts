import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {createVitest} from 'vitest/node'
import {describe, expect, test} from 'vitest'
import {deviceTestNames} from './summary.ts'

const app = new URL('../../', import.meta.url)
const deviceFiles = readdirSync(new URL('tests/', app))
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `tests/${name}`)
  .sort()

describe(deviceTestNames.name, () => {
  test('names the tests of each device test file the way Vitest collects them', async () => {
    const vitest = await createVitest('test', {
      root: fileURLToPath(app),
      config: false,
      watch: false,
      include: deviceFiles,
      reporters: [],
    })
    try {
      const {testModules} = await vitest.collect()
      const collected = Object.fromEntries(
        testModules.map((testModule) => [testModule.relativeModuleId, [...testModule.children.allTests()].map((testCase) => testCase.fullName.replaceAll('\\"', '"'))]),
      )
      const named = Object.fromEntries(deviceFiles.map((file) => [file, deviceTestNames(readFileSync(new URL(file, app), 'utf8'))]))
      expect(named).toEqual(collected)
    } finally {
      await vitest.close()
    }
  }, 30_000)
})
