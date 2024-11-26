import {Feature} from 'racejar/vitest'
import blockObjectsFeature from '../gherkin-spec/block-objects.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: blockObjectsFeature,
  stepDefinitions,
  parameterTypes,
})
