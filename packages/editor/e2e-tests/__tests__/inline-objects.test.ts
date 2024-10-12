/** @jest-environment ./setup/jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import {parameterTypes} from '../../gherkin-spec/gherkin-parameter-types'
import inlineObjectsFeature from '../../gherkin-spec/inline-objects.feature'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: inlineObjectsFeature,
  stepDefinitions,
  parameterTypes,
})
