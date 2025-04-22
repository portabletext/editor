import {Feature} from 'racejar/vitest'
import insertBlockFeature from '../gherkin-spec/insert.block.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: insertBlockFeature,
  stepDefinitions,
  parameterTypes,
})
