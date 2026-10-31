import {readFileSync} from 'node:fs'
import {countDeviceTests, countSpaceTests, suiteSeconds} from './lib/budget.ts'

const file = process.argv[2]
if (!file) throw new Error('usage: node scripts/suite-seconds.ts <test file>')
const source = readFileSync(file, 'utf8')
const testCount = countDeviceTests(source)
if (testCount === 0) throw new Error(`no tests in ${file}`)
console.log(suiteSeconds(testCount, countSpaceTests(source)))
