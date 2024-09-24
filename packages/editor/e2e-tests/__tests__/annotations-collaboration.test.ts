/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import annotationsCollaboration from './annotations-collaboration.feature'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: annotationsCollaboration,
  stepDefinitions,
  parameterTypes,
})
