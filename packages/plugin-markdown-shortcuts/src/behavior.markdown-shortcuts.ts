import type {EditorContext} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'

export type ObjectWithOptionalKey = {
  _type: string
  _key?: string
  [other: string]: unknown
}

export type MarkdownBehaviorsConfig = {
  horizontalRuleObject?: ({
    context,
  }: {
    context: Pick<EditorContext, 'schema' | 'keyGenerator'>
  }) => ObjectWithOptionalKey | undefined
  defaultStyle?: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
}

export function createMarkdownBehaviors(config: MarkdownBehaviorsConfig) {
  const automaticHrOnPaste = defineBehavior({
    on: 'clipboard.paste',
    guard: ({snapshot, event}) => {
      const text = event.originEvent.dataTransfer.getData('text/plain')
      const hrRegExp = /^(---)$|^(—-)$|^(___)$|^(\*\*\*)$/
      const hrCharacters = text.match(hrRegExp)?.[0]
      const hrObject = config.horizontalRuleObject?.({
        context: {
          schema: snapshot.context.schema,
          keyGenerator: snapshot.context.keyGenerator,
        },
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
        raise({
          type: 'insert.text',
          text: hrCharacters,
        }),
      ],
      ({snapshot}, {hrObject, focusBlock, focusTextBlock}) =>
        focusTextBlock
          ? [
              raise({
                type: 'insert.block',
                block: {
                  _type: snapshot.context.schema.block.name,
                  children: focusTextBlock.node.children,
                },
                placement: 'after',
              }),
              raise({
                type: 'insert.block',
                block: hrObject,
                placement: 'after',
              }),
              raise({
                type: 'delete.block',
                at: focusBlock.path,
              }),
            ]
          : [
              raise({
                type: 'insert.block',
                block: hrObject,
                placement: 'after',
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
        context: {schema: snapshot.context.schema},
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
        raise({
          type: 'block.set',
          props: {style: defaultStyle},
          at: focusTextBlock.path,
        }),
      ],
    ],
  })

  const markdownBehaviors = [automaticHrOnPaste, clearStyleOnBackspace]

  return markdownBehaviors
}
