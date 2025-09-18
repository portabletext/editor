import type {Locator} from '@vitest/browser/context'
import type {Editor} from '../../editor'

/**
 * @internal
 */
export type Context = {
  editor: Editor
  locator: Locator
  keyMap?: Map<string, string>
}
