/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import featureFile from './block-objects.feature'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: featureFile,
  stepDefinitions,
  parameterTypes,
})
