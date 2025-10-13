import type {EditorSchema} from '@portabletext/editor'
import {defineBehavior, execute} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
import * as utils from '@portabletext/editor/utils'

export type MarkdownBehaviorsConfig = {
  horizontalRuleObject?: (context: {
    schema: EditorSchema
  }) => {name: string; value?: {[prop: string]: unknown}} | undefined
  defaultStyle?: (context: {schema: EditorSchema}) => string | undefined
  headingStyle?: (context: {
    schema: EditorSchema
    level: number
  }) => string | undefined
  blockquoteStyle?: (context: {schema: EditorSchema}) => string | undefined
  unorderedList?: (context: {schema: EditorSchema}) => string | undefined
  orderedList?: (context: {schema: EditorSchema}) => string | undefined
}

export function createMarkdownBehaviors(config: MarkdownBehaviorsConfig) {
  const automaticBlockquoteOnSpace = defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)
      const focusSpan = selectors.getFocusSpan(snapshot)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const previousInlineObject = selectors.getPreviousInlineObject(snapshot)
      const blockOffset = utils.spanSelectionPointToBlockOffset({
        context: snapshot.context,
        selectionPoint: {
          path: [
            {_key: focusTextBlock.node._key},
            'children',
            {_key: focusSpan.node._key},
          ],
          offset: snapshot.context.selection?.focus.offset ?? 0,
        },
      })

      if (previousInlineObject || !blockOffset) {
        return false
      }

      const blockText = utils.getTextBlockText(focusTextBlock.node)
      const caretAtTheEndOfQuote = blockOffset.offset === 1
      const looksLikeMarkdownQuote = /^>/.test(blockText)
      const blockquoteStyle = config.blockquoteStyle?.({
        schema: snapshot.context.schema,
      })

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
        execute({
          type: 'insert.text',
          text: ' ',
        }),
      ],
      (_, {focusTextBlock, style}) => [
        execute({
          type: 'block.unset',
          props: ['listItem', 'level'],
          at: focusTextBlock.path,
        }),
        execute({
          type: 'block.set',
          props: {style},
          at: focusTextBlock.path,
        }),
        execute({
          type: 'delete.text',
          at: {
            anchor: {
              path: focusTextBlock.path,
              offset: 0,
            },
            focus: {
              path: focusTextBlock.path,
              offset: 2,
            },
          },
        }),
      ],
    ],
  })
  const automaticHr = defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
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

      const hrObject = config.horizontalRuleObject?.({
        schema: snapshot.context.schema,
      })
      const focusBlock = selectors.getFocusTextBlock(snapshot)
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      if (!hrObject || !focusBlock || !selectionCollapsed) {
        return false
      }

      const previousInlineObject = selectors.getPreviousInlineObject(snapshot)
      const textBefore = selectors.getBlockTextBefore(snapshot)
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

      if (
        !previousInlineObject &&
        textBefore === `${hrCharacter}${hrCharacter}`
      ) {
        return {hrObject, focusBlock, hrCharacter, hrBlockOffsets}
      }

      return false
    },
    actions: [
      (_, {hrCharacter}) => [
        execute({
          type: 'insert.text',
          text: hrCharacter,
        }),
      ],
      (_, {hrObject, hrBlockOffsets}) => [
        execute({
          type: 'insert.block',
          block: {
            _type: hrObject.name,
            ...(hrObject.value ?? {}),
          },
          placement: 'before',
          select: 'none',
        }),
        execute({
          type: 'delete.text',
          at: hrBlockOffsets,
        }),
      ],
    ],
  })
  const automaticHrOnPaste = defineBehavior({
    on: 'clipboard.paste',
    guard: ({snapshot, event}) => {
      const text = event.originEvent.dataTransfer.getData('text/plain')
      const hrRegExp = /^(---)$|(___)$|(\*\*\*)$/
      const hrCharacters = text.match(hrRegExp)?.[0]
      const hrObject = config.horizontalRuleObject?.({
        schema: snapshot.context.schema,
      })
      const focusBlock = selectors.getFocusBlock(snapshot)
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)

      if (!hrCharacters || !hrObject || !focusBlock) {
        return false
      }

      return {hrCharacters, hrObject, focusBlock, focusTextBlock}
    },
    actions: [
      (_, {hrCharacters}) => [
        execute({
          type: 'insert.text',
          text: hrCharacters,
        }),
      ],
      ({snapshot}, {hrObject, focusBlock, focusTextBlock}) =>
        focusTextBlock
          ? [
              execute({
                type: 'insert.block',
                block: {
                  _type: snapshot.context.schema.block.name,
                  children: focusTextBlock.node.children,
                },
                placement: 'after',
              }),
              execute({
                type: 'insert.block',
                block: {
                  _type: hrObject.name,
                  ...(hrObject.value ?? {}),
                },
                placement: 'after',
              }),
              execute({
                type: 'delete.block',
                at: focusBlock.path,
              }),
            ]
          : [
              execute({
                type: 'insert.block',
                block: {
                  _type: hrObject.name,
                  ...(hrObject.value ?? {}),
                },
                placement: 'after',
              }),
            ],
    ],
  })
  const automaticHeadingOnSpace = defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)
      const focusSpan = selectors.getFocusSpan(snapshot)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const blockOffset = utils.spanSelectionPointToBlockOffset({
        context: snapshot.context,
        selectionPoint: {
          path: [
            {_key: focusTextBlock.node._key},
            'children',
            {_key: focusSpan.node._key},
          ],
          offset: snapshot.context.selection?.focus.offset ?? 0,
        },
      })

      if (!blockOffset) {
        return false
      }

      const previousInlineObject = selectors.getPreviousInlineObject(snapshot)
      const blockText = utils.getTextBlockText(focusTextBlock.node)
      const markdownHeadingSearch = /^#+/.exec(blockText)
      const level = markdownHeadingSearch
        ? markdownHeadingSearch[0].length
        : undefined
      const caretAtTheEndOfHeading = blockOffset.offset === level

      if (previousInlineObject || !caretAtTheEndOfHeading) {
        return false
      }

      const style =
        level !== undefined
          ? config.headingStyle?.({schema: snapshot.context.schema, level})
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
      ({event}) => [execute(event)],
      (_, {focusTextBlock, style, level}) => [
        execute({
          type: 'block.unset',
          props: ['listItem', 'level'],
          at: focusTextBlock.path,
        }),
        execute({
          type: 'block.set',
          props: {style},
          at: focusTextBlock.path,
        }),
        execute({
          type: 'delete.text',
          at: {
            anchor: {
              path: focusTextBlock.path,
              offset: 0,
            },
            focus: {
              path: focusTextBlock.path,
              offset: level + 1,
            },
          },
        }),
      ],
    ],
  })
  const clearStyleOnBackspace = defineBehavior({
    on: 'delete.backward',
    guard: ({snapshot}) => {
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)
      const focusSpan = selectors.getFocusSpan(snapshot)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const atTheBeginningOfBLock =
        focusTextBlock.node.children[0]._key === focusSpan.node._key &&
        snapshot.context.selection?.focus.offset === 0

      const defaultStyle = config.defaultStyle?.({
        schema: snapshot.context.schema,
      })

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
        execute({
          type: 'block.set',
          props: {style: defaultStyle},
          at: focusTextBlock.path,
        }),
      ],
    ],
  })
  const automaticListOnSpace = defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      const isSpace = event.text === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)
      const focusSpan = selectors.getFocusSpan(snapshot)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const previousInlineObject = selectors.getPreviousInlineObject(snapshot)
      const blockOffset = utils.spanSelectionPointToBlockOffset({
        context: snapshot.context,
        selectionPoint: {
          path: [
            {_key: focusTextBlock.node._key},
            'children',
            {_key: focusSpan.node._key},
          ],
          offset: snapshot.context.selection?.focus.offset ?? 0,
        },
      })

      if (previousInlineObject || !blockOffset) {
        return false
      }

      const blockText = utils.getTextBlockText(focusTextBlock.node)
      const defaultStyle = config.defaultStyle?.({
        schema: snapshot.context.schema,
      })
      const looksLikeUnorderedList = /^(-|\*)/.test(blockText)
      const unorderedList = config.unorderedList?.({
        schema: snapshot.context.schema,
      })
      const caretAtTheEndOfUnorderedList = blockOffset.offset === 1

      if (
        defaultStyle &&
        caretAtTheEndOfUnorderedList &&
        looksLikeUnorderedList &&
        unorderedList !== undefined
      ) {
        return {
          focusTextBlock,
          listItem: unorderedList,
          listItemLength: 1,
          style: defaultStyle,
        }
      }

      const looksLikeOrderedList = /^1\./.test(blockText)
      const orderedList = config.orderedList?.({
        schema: snapshot.context.schema,
      })
      const caretAtTheEndOfOrderedList = blockOffset.offset === 2

      if (
        defaultStyle &&
        caretAtTheEndOfOrderedList &&
        looksLikeOrderedList &&
        orderedList !== undefined
      ) {
        return {
          focusTextBlock,
          listItem: orderedList,
          listItemLength: 2,
          style: defaultStyle,
        }
      }

      return false
    },
    actions: [
      ({event}) => [execute(event)],
      (_, {focusTextBlock, style, listItem, listItemLength}) => [
        execute({
          type: 'block.set',
          props: {
            listItem,
            level: 1,
            style,
          },
          at: focusTextBlock.path,
        }),
        execute({
          type: 'delete.text',
          at: {
            anchor: {
              path: focusTextBlock.path,
              offset: 0,
            },
            focus: {
              path: focusTextBlock.path,
              offset: listItemLength + 1,
            },
          },
        }),
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
