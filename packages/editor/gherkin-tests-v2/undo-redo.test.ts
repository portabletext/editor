import {Feature} from 'racejar/vitest'
import undoRedoCollaborationFeature from '../gherkin-spec/undo-redo-collaboration.feature?raw'
import undoRedoFeature from '../gherkin-spec/undo-redo.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

// Feature({
//   featureText: undoRedoFeature,
//   stepDefinitions,
//   parameterTypes,
// })

Feature({
  featureText: undoRedoCollaborationFeature,
  stepDefinitions,
  parameterTypes,
})
