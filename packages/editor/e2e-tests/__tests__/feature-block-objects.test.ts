/** @jest-environment ./setup/collaborative.jest.env.ts */

import featureFile from './block-objects.feature'
import {Feature} from './gherkin-driver'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: featureFile,
  stepDefinitions,
  parameterTypes,
})
