import type {PortableTextBlock} from '@sanity/types'
import type {Locator} from '@vitest/browser/context'
import type {Editor} from '../src/editor'
import type {EditorActor} from '../src/editor/editor-machine'
import type {EditorSelection} from '../src/editor/editor-selection'
import type {EditorSnapshot} from '../src/editor/editor-snapshot'
import type {PortableTextSlateEditor} from '../src/types/editor'

export type Context = {
  editor: {
    ref: React.RefObject<Editor>
    actorRef: React.RefObject<EditorActor>
    slateRef: React.RefObject<PortableTextSlateEditor>
    locator: Locator
    value: () => Array<PortableTextBlock>
    selection: () => EditorSelection
    snapshot: () => EditorSnapshot
  }
  keyMap?: Map<string, string>
}
