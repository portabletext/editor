import {Feature} from 'racejar/vitest'
import annotationsAcrossBlocksFeature from '../gherkin-spec/annotations-across-blocks.feature?raw'
import annotationsEdgeCasesFeature from '../gherkin-spec/annotations-edge-cases.feature?raw'
import annotationsOverlappingDecoratorsFeature from '../gherkin-spec/annotations-overlapping-decorators.feature?raw'
import annotationsOverlappingFeature from '../gherkin-spec/annotations-overlapping.feature?raw'
import annotationsFeature from '../gherkin-spec/annotations.feature?raw'
import {parameterTypes} from '../src/test'
import {stepDefinitions} from '../src/test/vitest'

Feature({
  featureText: annotationsFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsOverlappingFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsOverlappingDecoratorsFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsAcrossBlocksFeature,
  stepDefinitions,
  parameterTypes,
})

Feature({
  featureText: annotationsEdgeCasesFeature,
  stepDefinitions,
  parameterTypes,
})
