import {
  isObject,
  Node,
  Text,
  type Ancestor,
  type Descendant,
  type ExtendedType,
  type Path,
} from '..'

/**
 * `Element` objects are a type of node in a Slate document that contain other
 * element nodes or text nodes. They can be either "blocks" or "inlines"
 * depending on the Slate editor's configuration.
 */

export interface BaseElement {
  children?: Descendant[]
}

export type Element = ExtendedType<'Element', BaseElement>

export interface ElementIsElementOptions {
  deep?: boolean
}

export interface ElementInterface {
  /**
   * Check if a value implements the 'Ancestor' interface.
   */
  isAncestor: (
    value: any,
    options?: ElementIsElementOptions,
  ) => value is Ancestor

  /**
   * Check if a value implements the `Element` interface.
   */
  isElement: (value: any, options?: ElementIsElementOptions) => value is Element

  /**
   * Check if a value is an array of `Element` objects.
   */
  isElementList: (
    value: any,
    options?: ElementIsElementOptions,
  ) => value is Element[]

  /**
   * Check if a set of props is a partial of Element.
   */
  isElementProps: (props: any) => props is Partial<Element>

  /**
   * Check if a value implements the `Element` interface and has elementKey with selected value.
   * Default it check to `type` key value
   */
  isElementType: <T extends Element>(
    value: any,
    elementVal: string,
    elementKey?: string,
  ) => value is T

  /**
   * Check if an element matches set of properties.
   *
   * Note: this checks custom properties, and it does not ensure that any
   * children are equivalent.
   */
  matches: (element: Element, props: Partial<Element>) => boolean
}

/**
 * Shared the function with isElementType utility
 */
const isElement = (
  value: any,
  _options?: ElementIsElementOptions,
): value is Element => {
  if (!isObject(value)) {
    return false
  }

  // PERF: No need to use the full Editor.isEditor here
  const isEditor = typeof value.apply === 'function'
  if (isEditor) {
    return false
  }

  // An Element is any object with a _type string that's not the Editor
  // and not a Text node (span). Spans have _type equal to the configured
  // span type name, so we exclude them to maintain Slate's Element vs
  // Text mutual exclusion.
  return typeof value._type === 'string' && !Text.isText(value)
}

// eslint-disable-next-line no-redeclare
export const Element: ElementInterface = {
  isAncestor(
    value: any,
    {deep = false}: ElementIsElementOptions = {},
  ): value is Ancestor {
    return isObject(value) && Node.isNodeList(value.children, {deep})
  },

  isElement,

  isElementList(
    value: any,
    {deep = false}: ElementIsElementOptions = {},
  ): value is Element[] {
    return (
      Array.isArray(value) &&
      value.every((val) => Element.isElement(val, {deep}))
    )
  },

  isElementProps(props: any): props is Partial<Element> {
    return (
      isObject(props) && typeof props._type === 'string' && !Text.isText(props)
    )
  },

  isElementType: <T extends Element>(
    value: any,
    elementVal: string,
    elementKey: string = 'type',
  ): value is T => {
    return (
      isElement(value) && value[elementKey as keyof Descendant] === elementVal
    )
  },

  matches(element: Element, props: Partial<Element>): boolean {
    for (const key in props) {
      if (key === 'children') {
        continue
      }

      if (element[key as keyof Descendant] !== props[key as keyof Descendant]) {
        return false
      }
    }

    return true
  },
}

/**
 * `ElementEntry` objects refer to an `Element` and the `Path` where it can be
 * found inside a root node.
 */
export type ElementEntry = [Element, Path]
