import type {BlockEnabledFeatures, DeserializerRule} from '../../types'
import createGDocsRules from './gdocs'
import createHTMLRules from './html'
import createNotionRules from './notion'
import createWordRules from './word'

export function createRules(
  options: BlockEnabledFeatures & {keyGenerator?: () => string},
): DeserializerRule[] {
  return [
    ...createWordRules(),
    ...createNotionRules(),
    ...createGDocsRules(options),
    ...createHTMLRules(options),
  ]
}
