import type {Locator} from 'vitest/browser'
import type {Editor} from '../../editor'

/**
 * @internal
 */
export type Context = {
  editor: Editor
  editorB: Editor
  locator: Locator
  locatorB: Locator
  keyMap?: Map<string, string>
}
