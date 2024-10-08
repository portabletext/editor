import {Feature} from '@sanity/gherkin-driver/vitest'
import {parameterTypes} from '../e2e-tests/__tests__/gherkin-parameter-types'
import undoRedoFeature from '../e2e-tests/__tests__/undo-redo.feature?raw'
import {stepDefinitions} from './vitest-gherkin-step-definitions'

Feature({
  featureText: undoRedoFeature,
  stepDefinitions,
  parameterTypes,
})
