import {Feature} from 'racejar/vitest'
import blockObjectsInsertBlocksFeature from '../gherkin-spec/block-objects.insert-blocks.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: blockObjectsInsertBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
