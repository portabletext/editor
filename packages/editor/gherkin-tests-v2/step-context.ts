import type {Locator} from '@vitest/browser/context'
import type {Editor, PortableTextBlock} from '../src'
import type {NativeBehaviorEvent} from '../src/behaviors'
import type {EditorSnapshot} from '../src/editor/editor-snapshot'
import type {EditorSelection} from '../src/types/editor'

export type Context = {
  editor: {
    ref: React.RefObject<Editor>
    locator: Locator
    value: () => Array<PortableTextBlock>
    selection: () => EditorSelection
    sendNativeEvent: (event: NativeBehaviorEvent) => void
    snapshot: () => EditorSnapshot
  }
  keyMap?: Map<string, string>
}
