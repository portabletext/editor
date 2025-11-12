import {Feature} from 'racejar/vitest'
import selectionAdjustmentFeature from '../gherkin-spec/selection-adjustment.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: selectionAdjustmentFeature,
  stepDefinitions,
  parameterTypes,
})
