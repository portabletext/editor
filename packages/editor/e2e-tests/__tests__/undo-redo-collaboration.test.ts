/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import undoRedoCollaboration from './undo-redo-collaboration.feature'

Feature({
  featureText: undoRedoCollaboration,
  stepDefinitions,
  parameterTypes,
})
