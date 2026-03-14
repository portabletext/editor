import {isElement} from '../element/is-element'
import type {Editor} from '../interfaces/editor'
import type {Element} from '../interfaces/element'
import type {Location} from '../interfaces/location'
import type {NodeEntry} from '../interfaces/node'
import type {MaximizeMode} from '../types/types'
import {above} from './above'

export function elementReadOnly(
  editor: Editor,
  options: {at?: Location; mode?: MaximizeMode; voids?: boolean} = {},
): NodeEntry<Element> | undefined {
  return above(editor, {
    ...options,
    match: (n) => isElement(n, editor.schema) && editor.isElementReadOnly(n),
  }) as NodeEntry<Element> | undefined
}
