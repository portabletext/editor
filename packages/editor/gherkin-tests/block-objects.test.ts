import {Feature} from 'racejar/vitest'
import blockObjectsFeature from '../gherkin-spec/block-objects.feature?raw'
import blockObjectsInsertBlockFeature from '../gherkin-spec/block-objects.insert-block.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: blockObjectsFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: blockObjectsInsertBlockFeature,
  stepDefinitions,
  parameterTypes,
})
