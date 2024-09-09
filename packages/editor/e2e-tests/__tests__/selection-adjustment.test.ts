/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from './gherkin-driver'
import {parameterTypes, stepDefinitions} from './gherkin-step-definitions'
import selectionAdjustment from './selection-adjustment.feature'

Feature({
  featureText: selectionAdjustment,
  stepDefinitions,
  parameterTypes,
})
