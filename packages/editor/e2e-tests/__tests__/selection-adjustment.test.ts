/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import selectionAdjustment from './selection-adjustment.feature'

Feature({
  featureText: selectionAdjustment,
  stepDefinitions,
  parameterTypes,
})
