import {createGloballyScopedContext} from '../internal-utils/globally-scoped-context'
import type {Editor} from './create-editor'

export const EditorContext = createGloballyScopedContext<Editor | null>(
  '@portabletext/editor/context/editor',
  null,
)
