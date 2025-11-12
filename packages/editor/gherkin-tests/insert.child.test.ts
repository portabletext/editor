import {Feature} from 'racejar/vitest'
import insertChildFeature from '../gherkin-spec/insert.child.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: insertChildFeature,
  stepDefinitions,
  parameterTypes,
})
