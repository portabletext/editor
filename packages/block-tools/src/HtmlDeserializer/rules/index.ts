import type {Schema} from '@portabletext/schema'
import type {DeserializerRule} from '../../types'
import createGDocsRules from './gdocs'
import createHTMLRules from './html'
import createNotionRules from './notion'
import createWordRules from './word'

export function createRules(
  schema: Schema,
  options: {keyGenerator?: () => string},
): DeserializerRule[] {
  return [
    ...createWordRules(),
    ...createNotionRules(),
    ...createGDocsRules(schema),
    ...createHTMLRules(schema, options),
  ]
}
