import {Feature} from 'racejar/vitest'
import blockObjectsFeature from '../gherkin-spec/block-objects.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: blockObjectsFeature,
  stepDefinitions,
  parameterTypes,
})
