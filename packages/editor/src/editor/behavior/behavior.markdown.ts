import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import {defineBehavior} from './behavior.types'
import {
  getFocusSpan,
  getFocusTextBlock,
  selectionIsCollapsed,
} from './behavior.utils'

/**
 * @alpha
 */
export type MarkdownBehaviorsConfig = {
  mapDefaultStyle: (schema: PortableTextMemberSchemaTypes) => string | undefined
  mapHeadingStyle: (
    schema: PortableTextMemberSchemaTypes,
    level: number,
  ) => string | undefined
  mapBlockquoteStyle: (
    schema: PortableTextMemberSchemaTypes,
  ) => string | undefined
  mapUnorderedListStyle: (
    schema: PortableTextMemberSchemaTypes,
  ) => string | undefined
  mapOrderedListStyle: (
    schema: PortableTextMemberSchemaTypes,
  ) => string | undefined
}

/**
 * @alpha
 */
export function createMarkdownBehaviors(config: MarkdownBehaviorsConfig) {
  const automaticBlockquoteOnSpace = defineBehavior({
    on: 'insert text',
    guard: ({context, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectionIsCollapsed(context)
      const focusTextBlock = getFocusTextBlock(context)
      const focusSpan = getFocusSpan(context)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const caretAtTheEndOfQuote = context.selection.focus.offset === 1
      const looksLikeMarkdownQuote = /^>/.test(focusSpan.node.text)
      const blockquoteStyle = config.mapBlockquoteStyle(context.schema)

      if (
        caretAtTheEndOfQuote &&
        looksLikeMarkdownQuote &&
        blockquoteStyle !== undefined
      ) {
        return {focusTextBlock, focusSpan, style: blockquoteStyle}
      }

      return false
    },
    actions: [
      () => [
        {
          type: 'insert text',
          text: ' ',
        },
      ],
      (_, {focusTextBlock, focusSpan, style}) => [
        {
          type: 'unset block',
          props: ['listItem', 'level'],
          paths: [focusTextBlock.path],
        },
        {
          type: 'set block',
          style,
          paths: [focusTextBlock.path],
        },
        {
          type: 'delete',
          selection: {
            anchor: {
              path: focusSpan.path,
              offset: 0,
            },
            focus: {
              path: focusSpan.path,
              offset: 2,
            },
          },
        },
      ],
    ],
  })
  const automaticHeadingOnSpace = defineBehavior({
    on: 'insert text',
    guard: ({context, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectionIsCollapsed(context)
      const focusTextBlock = getFocusTextBlock(context)
      const focusSpan = getFocusSpan(context)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const markdownHeadingSearch = /^#+/.exec(focusSpan.node.text)
      const headingLevel = markdownHeadingSearch
        ? markdownHeadingSearch[0].length
        : undefined
      const caretAtTheEndOfHeading =
        context.selection.focus.offset === headingLevel

      if (!caretAtTheEndOfHeading) {
        return false
      }

      const headingStyle =
        headingLevel !== undefined
          ? config.mapHeadingStyle(context.schema, headingLevel)
          : undefined

      if (headingLevel !== undefined && headingStyle !== undefined) {
        return {
          focusTextBlock,
          focusSpan,
          style: headingStyle,
          level: headingLevel,
        }
      }

      return false
    },
    actions: [
      () => [
        {
          type: 'insert text',
          text: ' ',
        },
      ],
      (_, {focusTextBlock, focusSpan, style, level}) => [
        {
          type: 'unset block',
          props: ['listItem', 'level'],
          paths: [focusTextBlock.path],
        },
        {
          type: 'set block',
          style,
          paths: [focusTextBlock.path],
        },
        {
          type: 'delete',
          selection: {
            anchor: {
              path: focusSpan.path,
              offset: 0,
            },
            focus: {
              path: focusSpan.path,
              offset: level + 1,
            },
          },
        },
      ],
    ],
  })
  const clearStyleOnBackspace = defineBehavior({
    on: 'delete backward',
    guard: ({context}) => {
      const selectionCollapsed = selectionIsCollapsed(context)
      const focusTextBlock = getFocusTextBlock(context)
      const focusSpan = getFocusSpan(context)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const atTheBeginningOfBLock =
        focusTextBlock.node.children[0]._key === focusSpan.node._key &&
        context.selection.focus.offset === 0

      const defaultStyle = config.mapDefaultStyle(context.schema)

      if (
        atTheBeginningOfBLock &&
        defaultStyle &&
        focusTextBlock.node.style !== defaultStyle
      ) {
        return {defaultStyle, focusTextBlock}
      }

      return false
    },
    actions: [
      (_, {defaultStyle, focusTextBlock}) => [
        {
          type: 'set block',
          style: defaultStyle,
          paths: [focusTextBlock.path],
        },
      ],
    ],
  })
  const automaticListOnSpace = defineBehavior({
    on: 'insert text',
    guard: ({context, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectionIsCollapsed(context)
      const focusTextBlock = getFocusTextBlock(context)
      const focusSpan = getFocusSpan(context)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const defaultStyle = config.mapDefaultStyle(context.schema)
      const looksLikeUnorderedList = /^(-|\*)/.test(focusSpan.node.text)
      const unorderedListStyle = config.mapUnorderedListStyle(context.schema)
      const caretAtTheEndOfUnorderedList = context.selection.focus.offset === 1

      if (
        defaultStyle &&
        caretAtTheEndOfUnorderedList &&
        looksLikeUnorderedList &&
        unorderedListStyle !== undefined
      ) {
        return {
          focusTextBlock,
          focusSpan,
          listItem: unorderedListStyle,
          listItemLength: 1,
          style: defaultStyle,
        }
      }

      const looksLikeOrderedList = /^1./.test(focusSpan.node.text)
      const orderedListStyle = config.mapOrderedListStyle(context.schema)
      const caretAtTheEndOfOrderedList = context.selection.focus.offset === 2

      if (
        defaultStyle &&
        caretAtTheEndOfOrderedList &&
        looksLikeOrderedList &&
        orderedListStyle !== undefined
      ) {
        return {
          focusTextBlock,
          focusSpan,
          listItem: orderedListStyle,
          listItemLength: 2,
          style: defaultStyle,
        }
      }

      return false
    },
    actions: [
      () => [
        {
          type: 'insert text',
          text: ' ',
        },
      ],
      (_, {focusTextBlock, focusSpan, style, listItem, listItemLength}) => [
        {
          type: 'set block',
          listItem,
          level: 1,
          style,
          paths: [focusTextBlock.path],
        },
        {
          type: 'delete',
          selection: {
            anchor: {
              path: focusSpan.path,
              offset: 0,
            },
            focus: {
              path: focusSpan.path,
              offset: listItemLength + 1,
            },
          },
        },
      ],
    ],
  })

  const markdownBehaviors = [
    automaticBlockquoteOnSpace,
    automaticHeadingOnSpace,
    clearStyleOnBackspace,
    automaticListOnSpace,
  ]

  return markdownBehaviors
}
