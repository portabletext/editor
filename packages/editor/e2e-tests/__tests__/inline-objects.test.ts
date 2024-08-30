/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from './gherkin-driver'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import inlineObjectsFeature from './inline-objects.feature'

Feature({
  featureText: inlineObjectsFeature,
  stepDefinitions,
  parameterTypes,
})
