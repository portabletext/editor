/** @jest-environment ./setup/collaborative.jest.env.ts */

import {Feature} from '@sanity/gherkin-driver/jest'
import annotationsCollaboration from '../../gherkin-spec/annotations-collaboration.feature'
import {parameterTypes} from '../../gherkin-spec/gherkin-parameter-types'
import {stepDefinitions} from './gherkin-step-definitions'

Feature({
  featureText: annotationsCollaboration,
  stepDefinitions,
  parameterTypes,
})
