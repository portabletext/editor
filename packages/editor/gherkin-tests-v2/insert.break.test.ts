import {Feature} from 'racejar/vitest'
import insertBreakFeature from '../gherkin-spec/insert.break.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: insertBreakFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes: parameterTypes,
})
