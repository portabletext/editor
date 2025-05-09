import type {Editor} from '../editor'
import {createGloballyScopedContext} from '../internal-utils/globally-scoped-context'

export const EditorContext = createGloballyScopedContext<Editor | null>(
  '@portabletext/editor/context/editor',
  null,
)
