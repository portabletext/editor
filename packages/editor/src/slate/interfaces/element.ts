import {
  isObject,
  type Ancestor,
  type Descendant,
  type ExtendedType,
  type Path,
} from '..'
import type {EditorSchema} from '../../editor/editor-schema'

/**
 * `Element` objects are a type of node in a Slate document that contain other
 * element nodes or text nodes. They can be either "blocks" or "inlines"
 * depending on the Slate editor's configuration.
 */

export interface BaseElement {
  children: Descendant[]
}

export type Element = ExtendedType<'Element', BaseElement>

export interface ElementInterface {
  /**
   * Check if a value implements the 'Ancestor' interface.
   */
  isAncestor: (value: any, schema: EditorSchema) => value is Ancestor

  /**
   * Check if a value implements the `Element` interface.
   */
  isElement: (value: any, schema: EditorSchema) => value is Element
}

// eslint-disable-next-line no-redeclare
export const Element: ElementInterface = {
  isAncestor(value: any, schema: EditorSchema): value is Ancestor {
    return isObject(value) && value._type === schema.block.name
  },

  isElement(value: any, schema: EditorSchema): value is Element {
    return isObject(value) && value._type === schema.block.name
  },
}

/**
 * `ElementEntry` objects refer to an `Element` and the `Path` where it can be
 * found inside a root node.
 */
export type ElementEntry = [Element, Path]
