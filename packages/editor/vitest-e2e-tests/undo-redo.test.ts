import {Feature} from '@sanity/gherkin-driver/vitest'
import {parameterTypes} from '../gherkin-spec/gherkin-parameter-types'
import undoRedoFeature from '../gherkin-spec/undo-redo.feature?raw'
import {stepDefinitions} from './vitest-gherkin-step-definitions'

Feature({
  featureText: undoRedoFeature,
  stepDefinitions,
  parameterTypes,
})
