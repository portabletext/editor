import type {EditorSchema} from '@portabletext/editor'
import {defineBehavior, execute} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'

export type MarkdownBehaviorsConfig = {
  horizontalRuleObject?: (context: {
    schema: EditorSchema
  }) => {name: string; value?: {[prop: string]: unknown}} | undefined
  defaultStyle?: (context: {schema: EditorSchema}) => string | undefined
}

export function createMarkdownBehaviors(config: MarkdownBehaviorsConfig) {
  const automaticHrOnPaste = defineBehavior({
    on: 'clipboard.paste',
    guard: ({snapshot, event}) => {
      const text = event.originEvent.dataTransfer.getData('text/plain')
      const hrRegExp = /^(---)$|^(—-)$|^(___)$|^(\*\*\*)$/
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

  const markdownBehaviors = [automaticHrOnPaste, clearStyleOnBackspace]

  return markdownBehaviors
}
