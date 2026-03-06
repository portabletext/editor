import {isObject, Range} from '..'
import type {EditorSchema} from '../../editor/editor-schema'
import type {ExtendedType} from '../types/custom-types'
import {isDeepEqual} from '../utils/deep-equal'

/**
 * `Text` objects represent the nodes that contain the actual text content of a
 * Slate document along with any formatting properties. They are always leaf
 * nodes in the document tree as they cannot contain any children.
 */

export interface BaseText {
  text: string
}

export type Text = ExtendedType<'Text', BaseText>

export interface LeafPosition {
  start: number
  end: number
  isFirst?: true
  isLast?: true
}

export interface TextEqualsOptions {
  loose?: boolean
}

export type DecoratedRange = Range & {
  /**
   * Customize how another decoration is merged into a text node. If not specified, `Object.assign` would be used.
   * It is useful for overlapping decorations with the same key but different values.
   */
  merge?: (leaf: Text, decoration: object) => void
}

export interface TextInterface {
  /**
   * Check if two text nodes are equal.
   *
   * When loose is set, the text is not compared. This is
   * used to check whether sibling text nodes can be merged.
   */
  equals: (text: Text, another: Text, options?: TextEqualsOptions) => boolean

  /**
   * Check if a value implements the `Text` interface.
   */
  isText: (value: any, schema: EditorSchema) => value is Text

  /**
   * Get the leaves for a text node given decorations.
   */
  decorations: (
    node: Text,
    decorations: DecoratedRange[],
  ) => {leaf: Text; position?: LeafPosition}[]
}

// eslint-disable-next-line no-redeclare
export const Text: TextInterface = {
  equals(text: Text, another: Text, options: TextEqualsOptions = {}): boolean {
    const {loose = false} = options

    function omitText(obj: Record<any, any>) {
      const {text: _text, ...rest} = obj

      return rest
    }

    return isDeepEqual(
      loose ? omitText(text) : text,
      loose ? omitText(another) : another,
    )
  },

  isText(value: any, schema: EditorSchema): value is Text {
    return isObject(value) && value._type === schema.span.name
  },

  decorations(
    node: Text,
    decorations: DecoratedRange[],
  ): {leaf: Text; position?: LeafPosition}[] {
    let leaves: {leaf: Text; position?: LeafPosition}[] = [{leaf: {...node}}]

    for (const dec of decorations) {
      const {
        anchor: _anchor,
        focus: _focus,
        merge: mergeDecoration,
        ...rest
      } = dec
      const [start, end] = Range.edges(dec)
      const next = []
      let leafEnd = 0
      const decorationStart = start.offset
      const decorationEnd = end.offset
      const merge = mergeDecoration ?? Object.assign

      for (const {leaf} of leaves) {
        const {length} = leaf.text
        const leafStart = leafEnd
        leafEnd += length

        // If the range encompasses the entire leaf, add the range.
        if (decorationStart <= leafStart && leafEnd <= decorationEnd) {
          merge(leaf, rest)
          next.push({leaf})
          continue
        }

        // If the range expanded and match the leaf, or starts after, or ends before it, continue.
        if (
          (decorationStart !== decorationEnd &&
            (decorationStart === leafEnd || decorationEnd === leafStart)) ||
          decorationStart > leafEnd ||
          decorationEnd < leafStart ||
          (decorationEnd === leafStart && leafStart !== 0)
        ) {
          next.push({leaf})
          continue
        }

        // Otherwise we need to split the leaf, at the start, end, or both,
        // and add the range to the middle intersecting section. Do the end
        // split first since we don't need to update the offset that way.
        let middle = leaf
        let before: {leaf: Text} | undefined
        let after: {leaf: Text} | undefined

        if (decorationEnd < leafEnd) {
          const off = decorationEnd - leafStart
          after = {leaf: {...middle, text: middle.text.slice(off)}}
          middle = {...middle, text: middle.text.slice(0, off)}
        }

        if (decorationStart > leafStart) {
          const off = decorationStart - leafStart
          before = {leaf: {...middle, text: middle.text.slice(0, off)}}
          middle = {...middle, text: middle.text.slice(off)}
        }

        merge(middle, rest)

        if (before) {
          next.push(before)
        }

        next.push({leaf: middle})

        if (after) {
          next.push(after)
        }
      }

      leaves = next
    }

    if (leaves.length > 1) {
      let currentOffset = 0
      for (const [index, item] of leaves.entries()) {
        const start = currentOffset
        const end = start + item.leaf.text.length
        const position: LeafPosition = {start, end}

        if (index === 0) {
          position.isFirst = true
        }
        if (index === leaves.length - 1) {
          position.isLast = true
        }

        item.position = position
        currentOffset = end
      }
    }

    return leaves
  },
}
