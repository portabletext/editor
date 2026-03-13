import type {Element, Location, NodeEntry} from '../interfaces'
import {Editor} from '../interfaces/editor'
import {Element as ElementUtils} from '../interfaces/element'
import type {MaximizeMode} from '../types/types'
import {above} from './above'

export function elementReadOnly(
  editor: Editor,
  options: {at?: Location; mode?: MaximizeMode; voids?: boolean} = {},
): NodeEntry<Element> | undefined {
  return above(editor, {
    ...options,
    match: (n) =>
      ElementUtils.isElement(n, editor.schema) &&
      Editor.isElementReadOnly(editor, n),
  }) as NodeEntry<Element> | undefined
}
