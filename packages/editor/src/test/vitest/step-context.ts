import type {Locator} from 'vitest/browser'
import type {LargeLoad} from '../../../test-utils/large-load'
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
  large?: LargeLoad
}
