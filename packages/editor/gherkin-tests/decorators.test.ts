import {Feature} from 'racejar/vitest'
import decoratorsOverlappingFeature from '../gherkin-spec/decorators-overlapping.feature?raw'
import decoratorsFeature from '../gherkin-spec/decorators.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

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
