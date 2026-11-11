import {Feature} from 'racejar/vitest'
import loadFeature from '../gherkin-spec/load.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: loadFeature,
  stepDefinitions,
  parameterTypes,
})
