import {Feature} from '@sanity/gherkin-driver/vitest'
import undoRedoCollaborationFeature from '../gherkin-spec/undo-redo-collaboration.feature?raw'
import undoRedoFeature from '../gherkin-spec/undo-redo.feature?raw'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: undoRedoFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: undoRedoCollaborationFeature,
  stepDefinitions,
  parameterTypes,
})
