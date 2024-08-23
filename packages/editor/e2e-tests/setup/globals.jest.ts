import {type PortableTextBlock} from '@sanity/types'

import {type EditorSelection} from '../../src'

export {}

export type Editor = {
  editorId: string
  focus: () => Promise<void>
  getSelection: () => Promise<EditorSelection | null>
  getValue: () => Promise<PortableTextBlock[] | undefined>
  insertText: (text: string) => Promise<void>
  type: (text: string) => Promise<void>
  paste: (text: string, type?: string) => Promise<void>
  pressButton: (
    buttonName: 'add-comment' | 'remove-comment' | 'toggle-comment',
    times?: number,
  ) => Promise<void>
  pressKey: (keyName: string, times?: number) => Promise<void>
  redo: () => Promise<void>
  setSelection: (selection: EditorSelection | null) => Promise<void>
  testId: string
  toggleMark: (hotkey: string) => Promise<void>
  undo: () => Promise<void>
}

declare global {
  function getEditors(): Promise<Editor[]>
  function setDocumentValue(value: PortableTextBlock[] | undefined): Promise<void>
  /** Wait for editors to have settled with a new revision */
  function waitForRevision(): Promise<void>
}
