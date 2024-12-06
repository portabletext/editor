import {isPortableTextTextBlock} from '@sanity/types'
import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import {defineBehavior} from './behavior.types'
import {
  getFocusBlock,
  getFocusSpan,
  getFocusTextBlock,
  getTextBlockText,
  selectionIsCollapsed,
} from './behavior.utils'
import {spanSelectionPointToBlockOffset} from './behavior.utils.block-offset'
import {getBlockTextBefore} from './behavior.utils.get-text-before'

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
    on: 'insert.text',
    guard: ({context, state, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectionIsCollapsed(state)
      const focusTextBlock = getFocusTextBlock(state)
      const focusSpan = getFocusSpan(state)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const blockOffset = spanSelectionPointToBlockOffset({
        value: state.value,
        selectionPoint: {
          path: [
            {_key: focusTextBlock.node._key},
            'children',
            {_key: focusSpan.node._key},
          ],
          offset: state.selection.focus.offset,
        },
      })

      if (!blockOffset) {
        return false
      }

      const blockText = getTextBlockText(focusTextBlock.node)
      const caretAtTheEndOfQuote = blockOffset.offset === 1
      const looksLikeMarkdownQuote = /^>/.test(blockText)
      const blockquoteStyle = config.blockquoteStyle?.(context)

      if (
        caretAtTheEndOfQuote &&
        looksLikeMarkdownQuote &&
        blockquoteStyle !== undefined
      ) {
        return {focusTextBlock, style: blockquoteStyle}
      }

      return false
    },
    actions: [
      () => [
        {
          type: 'insert.text',
          text: ' ',
        },
      ],
      ({focusTextBlock, style}) => [
        {
          type: 'text block.unset',
          props: ['listItem', 'level'],
          at: focusTextBlock.path,
        },
        {
          type: 'text block.set',
          style,
          at: focusTextBlock.path,
        },
        {
          type: 'delete.text',
          anchor: {
            path: focusTextBlock.path,
            offset: 0,
          },
          focus: {
            path: focusTextBlock.path,
            offset: 2,
          },
        },
      ],
    ],
  })
  const automaticHr = defineBehavior({
    on: 'insert.text',
    guard: ({context, state, event}) => {
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

      const hrObject = config.horizontalRuleObject?.(context)
      const focusBlock = getFocusTextBlock(state)
      const selectionCollapsed = selectionIsCollapsed(state)

      if (!hrObject || !focusBlock || !selectionCollapsed) {
        return false
      }

      const textBefore = getBlockTextBefore(state)
      const hrBlockOffsets = {
        anchor: {
          path: focusBlock.path,
          offset: 0,
        },
        focus: {
          path: focusBlock.path,
          offset: 3,
        },
      }

      if (textBefore === `${hrCharacter}${hrCharacter}`) {
        return {hrObject, focusBlock, hrCharacter, hrBlockOffsets}
      }

      return false
    },
    actions: [
      ({hrCharacter}) => [
        {
          type: 'insert.text',
          text: hrCharacter,
        },
      ],
      ({hrObject, hrBlockOffsets}) => [
        {
          type: 'insert.block object',
          placement: 'before',
          blockObject: hrObject,
        },
        {
          type: 'delete.text',
          ...hrBlockOffsets,
        },
      ],
    ],
  })
  const automaticHrOnPaste = defineBehavior({
    on: 'paste',
    guard: ({context, state, event}) => {
      const text = event.data.getData('text/plain')
      const hrRegExp = /^(---)$|(___)$|(\*\*\*)$/gm
      const hrCharacters = text.match(hrRegExp)?.[0]
      const hrObject = config.horizontalRuleObject?.(context)
      const focusBlock = getFocusBlock(state)

      if (!hrCharacters || !hrObject || !focusBlock) {
        return false
      }

      return {hrCharacters, hrObject, focusBlock}
    },
    actions: [
      ({hrCharacters}) => [
        {
          type: 'insert.text',
          text: hrCharacters,
        },
      ],
      ({hrObject, focusBlock}) =>
        isPortableTextTextBlock(focusBlock.node)
          ? [
              {
                type: 'insert.text block',
                textBlock: {children: focusBlock.node.children},
                placement: 'after',
              },
              {
                type: 'insert.block object',
                blockObject: hrObject,
                placement: 'after',
              },
              {type: 'delete.block', blockPath: focusBlock.path},
            ]
          : [
              {
                type: 'insert.block object',
                blockObject: hrObject,
                placement: 'after',
              },
            ],
    ],
  })
  const automaticHeadingOnSpace = defineBehavior({
    on: 'insert.text',
    guard: ({context, state, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectionIsCollapsed(state)
      const focusTextBlock = getFocusTextBlock(state)
      const focusSpan = getFocusSpan(state)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const blockOffset = spanSelectionPointToBlockOffset({
        value: state.value,
        selectionPoint: {
          path: [
            {_key: focusTextBlock.node._key},
            'children',
            {_key: focusSpan.node._key},
          ],
          offset: state.selection.focus.offset,
        },
      })

      if (!blockOffset) {
        return false
      }

      const blockText = getTextBlockText(focusTextBlock.node)
      const markdownHeadingSearch = /^#+/.exec(blockText)
      const level = markdownHeadingSearch
        ? markdownHeadingSearch[0].length
        : undefined
      const caretAtTheEndOfHeading = blockOffset.offset === level

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
          style: style,
          level,
        }
      }

      return false
    },
    actions: [
      () => [
        {
          type: 'insert.text',
          text: ' ',
        },
      ],
      ({focusTextBlock, style, level}) => [
        {
          type: 'text block.unset',
          props: ['listItem', 'level'],
          at: focusTextBlock.path,
        },
        {
          type: 'text block.set',
          style,
          at: focusTextBlock.path,
        },
        {
          type: 'delete.text',
          anchor: {
            path: focusTextBlock.path,
            offset: 0,
          },
          focus: {
            path: focusTextBlock.path,
            offset: level + 1,
          },
        },
      ],
    ],
  })
  const clearStyleOnBackspace = defineBehavior({
    on: 'delete.backward',
    guard: ({context, state}) => {
      const selectionCollapsed = selectionIsCollapsed(state)
      const focusTextBlock = getFocusTextBlock(state)
      const focusSpan = getFocusSpan(state)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const atTheBeginningOfBLock =
        focusTextBlock.node.children[0]._key === focusSpan.node._key &&
        state.selection.focus.offset === 0

      const defaultStyle = config.defaultStyle?.(context)

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
      ({defaultStyle, focusTextBlock}) => [
        {
          type: 'text block.set',
          style: defaultStyle,
          at: focusTextBlock.path,
        },
      ],
    ],
  })
  const automaticListOnSpace = defineBehavior({
    on: 'insert.text',
    guard: ({context, state, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectionIsCollapsed(state)
      const focusTextBlock = getFocusTextBlock(state)
      const focusSpan = getFocusSpan(state)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const blockOffset = spanSelectionPointToBlockOffset({
        value: state.value,
        selectionPoint: {
          path: [
            {_key: focusTextBlock.node._key},
            'children',
            {_key: focusSpan.node._key},
          ],
          offset: state.selection.focus.offset,
        },
      })

      if (!blockOffset) {
        return false
      }

      const blockText = getTextBlockText(focusTextBlock.node)
      const defaultStyle = config.defaultStyle?.(context)
      const looksLikeUnorderedList = /^(-|\*)/.test(blockText)
      const unorderedListStyle = config.unorderedListStyle?.(context)
      const caretAtTheEndOfUnorderedList = blockOffset.offset === 1

      if (
        defaultStyle &&
        caretAtTheEndOfUnorderedList &&
        looksLikeUnorderedList &&
        unorderedListStyle !== undefined
      ) {
        return {
          focusTextBlock,
          listItem: unorderedListStyle,
          listItemLength: 1,
          style: defaultStyle,
        }
      }

      const looksLikeOrderedList = /^1\./.test(blockText)
      const orderedListStyle = config.orderedListStyle?.(context)
      const caretAtTheEndOfOrderedList = blockOffset.offset === 2

      if (
        defaultStyle &&
        caretAtTheEndOfOrderedList &&
        looksLikeOrderedList &&
        orderedListStyle !== undefined
      ) {
        return {
          focusTextBlock,
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
          type: 'insert.text',
          text: ' ',
        },
      ],
      ({focusTextBlock, style, listItem, listItemLength}) => [
        {
          type: 'text block.set',
          listItem,
          level: 1,
          style,
          at: focusTextBlock.path,
        },
        {
          type: 'delete.text',
          anchor: {
            path: focusTextBlock.path,
            offset: 0,
          },
          focus: {
            path: focusTextBlock.path,
            offset: listItemLength + 1,
          },
        },
      ],
    ],
  })

  const markdownBehaviors = [
    automaticBlockquoteOnSpace,
    automaticHeadingOnSpace,
    automaticHr,
    automaticHrOnPaste,
    clearStyleOnBackspace,
    automaticListOnSpace,
  ]

  return markdownBehaviors
}
