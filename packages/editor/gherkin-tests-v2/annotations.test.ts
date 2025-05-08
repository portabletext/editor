import {Feature} from 'racejar/vitest'
import annotationsFeature from '../gherkin-spec/annotations.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: annotationsFeature,
  stepDefinitions,
  parameterTypes,
})
