import {Feature} from 'racejar/vitest'
import selectionAdjustmentFeature from '../gherkin-spec/selection-adjustment.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: selectionAdjustmentFeature,
  stepDefinitions,
  parameterTypes,
})
