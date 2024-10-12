/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import selectionAdjustment from '../../gherkin-spec/selection-adjustment.feature'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: selectionAdjustment,
  stepDefinitions,
  parameterTypes,
})
