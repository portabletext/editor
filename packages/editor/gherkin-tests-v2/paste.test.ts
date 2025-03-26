import {Feature} from 'racejar/vitest'
import pasteFeature from '../gherkin-spec/paste.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: pasteFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes: parameterTypes,
})
