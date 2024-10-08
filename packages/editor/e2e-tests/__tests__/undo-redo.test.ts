/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes} from './gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'
import featureFile from './undo-redo.feature'

Feature({
  featureText: featureFile,
  stepDefinitions,
  parameterTypes,
})
