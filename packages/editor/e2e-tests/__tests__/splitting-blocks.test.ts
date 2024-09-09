/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from './gherkin-driver'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import featureFile from './splitting-blocks.feature'

Feature({
  featureText: featureFile,
  stepDefinitions,
  parameterTypes,
})