import type {Locator} from '@vitest/browser/context'
import type {Editor, PortableTextBlock} from '../src'
import type {EditorActor} from '../src/editor/editor-machine'
import type {EditorSnapshot} from '../src/editor/editor-snapshot'
import type {
  EditorSelection,
  PortableTextSlateEditor,
} from '../src/types/editor'

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
