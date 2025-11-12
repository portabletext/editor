import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {Editor} from 'slate'

const REMOTE_PATCHES = new WeakMap<
  Editor,
  {
    patch: Patch
    time: Date
    snapshot: PortableTextBlock[] | undefined
    previousSnapshot: PortableTextBlock[] | undefined
  }[]
>()

export const getRemotePatches = (editor: Editor) => {
  if (!REMOTE_PATCHES.get(editor)) {
    REMOTE_PATCHES.set(editor, [])
  }
  return REMOTE_PATCHES.get(editor) ?? []
}
