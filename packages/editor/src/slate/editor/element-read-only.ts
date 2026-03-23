import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {NodeEntry} from '../interfaces/node'
import type {MaximizeMode} from '../types/types'
import {above} from './above'

export function elementReadOnly(
  editor: Editor,
  options: {
    at?: Location
    mode?: MaximizeMode
    includeObjectNodes?: boolean
  } = {},
): NodeEntry<PortableTextTextBlock | PortableTextObject> | undefined {
  return above(editor, {
    ...options,
    match: (n) =>
      isTextBlock({schema: editor.schema}, n) && editor.isElementReadOnly(n),
  })
}
