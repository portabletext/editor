import {isHotkey} from 'is-hotkey-esm'
import {defineBehavior} from './behavior'
import {
  getFocusSpan,
  getFocusTextBlock,
  selectionIsCollapsed,
} from './behavior-utils'

/**
 * @alpha
 */
export const markdownBehaviors = [
  defineBehavior({
    on: 'before:native:insert text',
    guard: ({context, event}) => {
      const isSpace = event.event.data === ' '

      if (!isSpace) {
        return false
      }

      const selectionCollapsed = selectionIsCollapsed(context)
      const focusTextBlock = getFocusTextBlock(context)
      const focusSpan = getFocusSpan(context)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      const looksLikeMarkdownHeading = /^(#{1,6})/.test(focusSpan.node.text)

      const headingStyle = context.schema.styles.find(
        (style) => style.value === `h${focusSpan.node.text.length}`,
      )?.value

      if (looksLikeMarkdownHeading && headingStyle) {
        event.event.preventDefault()
        return {focusTextBlock, focusSpan, headingStyle}
      }

      return false
    },
    actions: [
      (_, {focusTextBlock, headingStyle}) => ({
        type: 'apply block style',
        style: headingStyle,
        paths: [focusTextBlock.path],
      }),
      (_, {focusSpan}) => ({
        type: 'delete text',
        selection: {
          anchor: {path: focusSpan.path, offset: 0},
          focus: {path: focusSpan.path, offset: focusSpan.node.text.length},
        },
      }),
    ],
  }),
  defineBehavior({
    on: 'before:native:key down',
    guard: ({context, event}) => {
      const isBackspace = isHotkey('backspace', event.event)

      if (!isBackspace) {
        return false
      }

      const selectionCollapsed = selectionIsCollapsed(context)
      const focusTextBlock = getFocusTextBlock(context)
      const focusSpan = getFocusSpan(context)

      if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
        return false
      }

      if (
        focusTextBlock.node.children.length === 1 &&
        focusTextBlock.node.style !== 'normal' &&
        focusSpan.node.text === ''
      ) {
        return {focusTextBlock}
      }

      return false
    },
    actions: [
      (_, {focusTextBlock}) => ({
        type: 'apply block style',
        style: 'normal',
        paths: [focusTextBlock.path],
      }),
    ],
  }),
]
