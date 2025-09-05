import type {Locator} from '@vitest/browser/context'
import type {Editor} from '../src'
import type {NativeBehaviorEvent} from '../src/behaviors'

export type Context = {
  editor: Editor & {
    sendNativeEvent: (event: NativeBehaviorEvent) => void
  }
  locator: Locator
  keyMap?: Map<string, string>
}
