import {Feature} from 'racejar/vitest'
import insertBreakFeature from '../gherkin-spec/insert.break.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: insertBreakFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes: parameterTypes,
})
