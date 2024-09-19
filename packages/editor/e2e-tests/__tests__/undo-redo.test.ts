/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import featureFile from './undo-redo.feature'

Feature({
  featureText: featureFile,
  stepDefinitions,
  parameterTypes,
})
