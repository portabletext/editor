import {Feature} from 'racejar/vitest'
import blockObjectsInsertBlockFeature from '../gherkin-spec/block-objects.insert-block.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: blockObjectsInsertBlockFeature,
  stepDefinitions,
  parameterTypes,
})
