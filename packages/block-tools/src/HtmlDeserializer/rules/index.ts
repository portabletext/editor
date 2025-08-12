import type {DeserializerRule} from '../../types'
import type {PortableTextSchema} from '../../util/portable-text-schema'
import createGDocsRules from './gdocs'
import createHTMLRules from './html'
import createNotionRules from './notion'
import createWordRules from './word'

export function createRules(
  schema: PortableTextSchema,
  options: {keyGenerator?: () => string},
): DeserializerRule[] {
  return [
    ...createWordRules(),
    ...createNotionRules(),
    ...createGDocsRules(schema),
    ...createHTMLRules(schema, options),
  ]
}
