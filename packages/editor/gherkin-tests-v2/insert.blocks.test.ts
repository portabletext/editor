import {Feature} from 'racejar/vitest'
import insertBlocksFeature from '../gherkin-spec/insert.blocks.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: insertBlocksFeature,
  stepDefinitions,
  parameterTypes,
})
