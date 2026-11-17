// thumbjar-test-count: 4
import {readFileSync} from 'node:fs'
import {Feature} from 'racejar/vitest'
import {deviceDefinitions} from '../scripts/gherkin.ts'

Feature({
  featureText: readFileSync(
    new URL('../../gherkin-spec/insert.text.feature', import.meta.url),
    'utf8',
  ),
  ...deviceDefinitions(),
})
