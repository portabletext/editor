import type {SchemaDefinition} from '@portabletext/schema'
import type {Locator} from 'vitest/browser'
import type {Editor} from '../../editor'
import type {Container} from '../../renderers/renderer.types'

/**
 * @internal
 */
export type Context = {
  editorConfig?: {
    schemaDefinition: SchemaDefinition
    containers: Array<Container>
  }
  editor: Editor
  editorB: Editor
  locator: Locator
  locatorB: Locator
  keyMap?: Map<string, string>
}
