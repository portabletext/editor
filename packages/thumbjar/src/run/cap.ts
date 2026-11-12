import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {countDeviceTests, deviceTestFileSeconds} from '../device/budget.ts'

const file = resolve(process.argv[2]!)
const testCount = countDeviceTests(readFileSync(file, 'utf8'))
if (testCount === 0) {
  throw new Error(`no tests in ${file}`)
}
process.stdout.write(`${deviceTestFileSeconds(testCount)}\n`)
