/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import inlineObjectsFeature from './inline-objects.feature'

Feature({
  featureText: inlineObjectsFeature,
  stepDefinitions,
  parameterTypes,
})
