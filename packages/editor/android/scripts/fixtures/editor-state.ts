import {compileSchema} from '@portabletext/schema'
import {
  createTestKeyGenerator,
  fromTextspec,
  selectionFromTextspec,
} from '@portabletext/test'
import {gherkinSchemaDefinition} from '../../../src/test/gherkin-schema.ts'

export function editorState(textspec: string) {
  const context = {
    schema: compileSchema(gherkinSchemaDefinition),
    keyGenerator: createTestKeyGenerator(),
  }
  const {blocks} = fromTextspec(context, textspec)
  return {
    value: blocks,
    selection: selectionFromTextspec(context, textspec, blocks),
  }
}
