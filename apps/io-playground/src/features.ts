import {compileScenarios} from '@portabletext/io'
import keysFeature from '@portabletext/io/gherkin-spec/keys.feature?raw'
import lifecycleFeature from '@portabletext/io/gherkin-spec/lifecycle.feature?raw'
import listenersFeature from '@portabletext/io/gherkin-spec/listeners.feature?raw'
import loadingAndEmptyFeature from '@portabletext/io/gherkin-spec/loading-and-empty.feature?raw'
import otherEditorsFeature from '@portabletext/io/gherkin-spec/other-editors.feature?raw'
import outOfStepAndResyncFeature from '@portabletext/io/gherkin-spec/out-of-step-and-resync.feature?raw'
import sendingAndConfirmingFeature from '@portabletext/io/gherkin-spec/sending-and-confirming.feature?raw'

export const features = [
  sendingAndConfirmingFeature,
  otherEditorsFeature,
  outOfStepAndResyncFeature,
  keysFeature,
  loadingAndEmptyFeature,
  listenersFeature,
  lifecycleFeature,
].map((featureText) => compileScenarios(featureText))
