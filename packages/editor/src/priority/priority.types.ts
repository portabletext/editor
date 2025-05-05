import {defaultKeyGenerator} from '../editor/key-generator'

export type EditorPriority = {
  id: string
  name?: string
  reference?: {
    priority: EditorPriority
    importance: 'higher' | 'lower'
  }
}

export function createEditorPriority(config?: {
  name?: string
  reference?: {
    priority: EditorPriority
    importance: 'higher' | 'lower'
  }
}): EditorPriority {
  return {
    id: defaultKeyGenerator(),
    name: config?.name,
    reference: config?.reference,
  }
}
