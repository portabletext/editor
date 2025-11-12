import {Feature} from 'racejar/vitest'
import pasteFeature from '../gherkin-spec/paste.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: pasteFeature,
  stepDefinitions: stepDefinitions,
  parameterTypes: parameterTypes,
})
