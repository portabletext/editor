/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import featureFile from './decorators.feature'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: featureFile,
  stepDefinitions,
  parameterTypes,
})
