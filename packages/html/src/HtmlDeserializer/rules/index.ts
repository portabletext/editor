import type {Schema} from '@portabletext/schema'
import type {SchemaMatchers} from '../../schema-matchers'
import type {DeserializerRule} from '../../types'
import {createWordOnlineRules} from '../word-online/rules.word-online'
import {createGDocsRules} from './rules.gdocs'
import {createHTMLRules} from './rules.html'
import {createNotionRules} from './rules.notion'
import {createWordRules} from './rules.word'

export function createRules(
  schema: Schema,
  options: {keyGenerator?: () => string; matchers?: SchemaMatchers},
): DeserializerRule[] {
  return [
    ...createWordRules(),
    ...createWordOnlineRules(schema, options),
    ...createNotionRules(),
    ...createGDocsRules(schema),
    ...createHTMLRules(schema, options),
  ]
}
