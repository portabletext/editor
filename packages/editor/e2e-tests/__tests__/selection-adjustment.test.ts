/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes} from '../../gherkin-spec/gherkin-parameter-types'
import selectionAdjustment from '../../gherkin-spec/selection-adjustment.feature'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: selectionAdjustment,
  stepDefinitions,
  parameterTypes,
})
