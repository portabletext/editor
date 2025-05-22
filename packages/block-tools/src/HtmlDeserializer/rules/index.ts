import type {ArraySchemaType} from '@sanity/types'
import type {BlockEnabledFeatures, DeserializerRule} from '../../types'
import createGDocsRules from './gdocs'
import createHTMLRules from './html'
import createNotionRules from './notion'
import {createOfficeOnlineRules} from './office-online'
import createWordRules from './word'

export function createRules(
  blockContentType: ArraySchemaType,
  options: BlockEnabledFeatures & {keyGenerator?: () => string},
): DeserializerRule[] {
  return [
    ...createWordRules(),
    ...createNotionRules(blockContentType),
    ...createGDocsRules(blockContentType, options),
    ...createOfficeOnlineRules(),
    ...createHTMLRules(blockContentType, options),
  ]
}
