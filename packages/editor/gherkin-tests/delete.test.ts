import {Feature} from 'racejar/vitest'
import deleteFeature from '../gherkin-spec/delete.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: deleteFeature,
  stepDefinitions,
  parameterTypes,
})
