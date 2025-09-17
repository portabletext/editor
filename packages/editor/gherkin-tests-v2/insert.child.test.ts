import {Feature} from 'racejar/vitest'
import insertChildFeature from '../gherkin-spec/insert.child.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: insertChildFeature,
  stepDefinitions,
  parameterTypes,
})
