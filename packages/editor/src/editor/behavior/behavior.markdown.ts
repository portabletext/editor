import {isPortableTextSpan} from '@portabletext/toolkit'
import {isPortableTextTextBlock} from '@sanity/types'
import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import {defineBehavior} from './behavior.types'
import {
  getFocusBlock,
  getFocusSpan,
  getFocusTextBlock,
  selectionIsCollapsed,
} from './behavior.utils'

/**
 * @alpha
 */
export type MarkdownBehaviorsConfig = {
  horizontalRuleObject?: (context: {
    schema: PortableTextMemberSchemaTypes
  }) => {name: string; value?: {[prop: string]: unknown}} | undefined
  defaultStyle?: (context: {
    schema: PortableTextMemberSchemaTypes
  }) => string | undefined
  headingStyle?: (context: {
    schema: PortableTextMemberSchemaTypes
    level: number
  }) => string | undefined
  blockquoteStyle?: (context: {
    schema: PortableTextMemberSchemaTypes
  }) => string | undefined
  unorderedListStyle?: (context: {
    schema: PortableTextMemberSchemaTypes
  }) => string | undefined
  orderedListStyle?: (context: {
    schema: PortableTextMemberSchemaTypes
  }) => string | undefined
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
      const blockquoteStyle = config.blockquoteStyle?.({schema: context.schema})

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
  const automaticBreak = defineBehavior({
    on: 'insert text',
    guard: ({context, event}) => {
      const hrCharacter =
        event.text === '-'
          ? '-'
          : event.text === '*'
            ? '*'
            : event.text === '_'
              ? '_'
              : undefined

      if (hrCharacter === undefined) {
        return false
      }

      const breakObject = config.horizontalRuleObject?.({
        schema: context.schema,
      })
      const focusBlock = getFocusTextBlock(context)
      const selectionCollapsed = selectionIsCollapsed(context)

      if (!breakObject || !focusBlock || !selectionCollapsed) {
        return false
      }

      const onlyText = focusBlock.node.children.every(isPortableTextSpan)
      const blockText = focusBlock.node.children
        .map((child) => child.text ?? '')
        .join('')

      if (onlyText && blockText === `${hrCharacter}${hrCharacter}`) {
        return {breakObject, focusBlock, hrCharacter}
      }

      return false
    },
    actions: [
      (_, {hrCharacter}) => [
        {
          type: 'insert text',
          text: hrCharacter,
        },
      ],
      (_, {breakObject, focusBlock}) => [
        {
          type: 'insert block object',
          ...breakObject,
        },
        {
          type: 'delete block',
          blockPath: focusBlock.path,
        },
        {
          type: 'insert text block',
        },
      ],
    ],
  })
  const automaticHrOnPaste = defineBehavior({
    on: 'paste',
    guard: ({context, event}) => {
      const text = event.clipboardData.getData('text/plain')
      const hrRegExp = /^(---)$|(___)$|(\*\*\*)$/gm
      const hrCharacters = text.match(hrRegExp)?.[0]
      const hrObject = config.horizontalRuleObject?.({
        schema: context.schema,
      })
      const focusBlock = getFocusBlock(context)

      if (!hrCharacters || !hrObject || !focusBlock) {
        return false
      }

      return {hrCharacters, hrObject, focusBlock}
    },
    actions: [
      (_, {hrCharacters}) => [
        {
          type: 'insert text',
          text: hrCharacters,
        },
      ],
      (_, {hrObject, focusBlock}) =>
        isPortableTextTextBlock(focusBlock.node)
          ? [
              {type: 'insert text block', children: focusBlock.node.children},
              {type: 'insert block object', ...hrObject},
              {type: 'delete block', blockPath: focusBlock.path},
            ]
          : [
              {
                type: 'insert block object',
                ...hrObject,
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
      const level = markdownHeadingSearch
        ? markdownHeadingSearch[0].length
        : undefined
      const caretAtTheEndOfHeading = context.selection.focus.offset === level

      if (!caretAtTheEndOfHeading) {
        return false
      }

      const style =
        level !== undefined
          ? config.headingStyle?.({schema: context.schema, level})
          : undefined

      if (level !== undefined && style !== undefined) {
        return {
          focusTextBlock,
          focusSpan,
          style: style,
          level,
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

      const defaultStyle = config.defaultStyle?.({schema: context.schema})

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

      const defaultStyle = config.defaultStyle?.({schema: context.schema})
      const looksLikeUnorderedList = /^(-|\*)/.test(focusSpan.node.text)
      const unorderedListStyle = config.unorderedListStyle?.({
        schema: context.schema,
      })
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
      const orderedListStyle = config.orderedListStyle?.({
        schema: context.schema,
      })
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
    automaticBreak,
    automaticHeadingOnSpace,
    automaticHrOnPaste,
    clearStyleOnBackspace,
    automaticListOnSpace,
  ]

  return markdownBehaviors
}
