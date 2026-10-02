import {compileScenarios} from '@portabletext/io/testing'

const featureFiles: Record<string, string> = import.meta.glob(
  '../../../packages/io/gherkin-spec/*.feature',
  {query: '?raw', import: 'default', eager: true},
)

const featureOrder = [
  'sending-and-confirming',
  'other-editors',
  'concurrent-edits',
  'out-of-step-and-resync',
  'keys',
  'loading-and-empty',
  'malformed-content',
  'listeners',
  'lifecycle',
]

/**
 * Every feature file in the package's `gherkin-spec`, the familiar ones in
 * reading order and any other after them.
 */
export const features = Object.entries(featureFiles)
  .map(([path, featureText]) => ({
    name: path.replace(/^.*\/(.+)\.feature$/, '$1'),
    featureText,
  }))
  .sort(
    (featureA, featureB) =>
      rank(featureA.name) - rank(featureB.name) ||
      featureA.name.localeCompare(featureB.name),
  )
  .map(({featureText}) => compileScenarios(featureText))

function rank(name: string): number {
  const index = featureOrder.indexOf(name)

  return index === -1 ? featureOrder.length : index
}
