import {Feature} from 'racejar/vitest'
import decoratorsOverlappingFeature from '../gherkin-spec/decorators-overlapping.feature?raw'
import decoratorsFeature from '../gherkin-spec/decorators.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: decoratorsFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: decoratorsOverlappingFeature,
  stepDefinitions,
  parameterTypes,
})
