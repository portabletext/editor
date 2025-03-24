import type {EditorSchema} from '../editor/define-schema'
import {looksLikeUrl} from '../internal-utils/looks-like-url'
import * as selectors from '../selectors'
import {defineBehavior} from './behavior.types.behavior'

/**
 * @beta
 */
export type LinkBehaviorsConfig = {
  linkAnnotation?: (context: {
    schema: EditorSchema
    url: string
  }) => {name: string; value: {[prop: string]: unknown}} | undefined
}

/**
 * @beta
 */
export function createLinkBehaviors(config: LinkBehaviorsConfig) {
  const pasteLinkOnSelection = defineBehavior({
    on: 'clipboard.paste',
    guard: ({snapshot, event}) => {
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
      const text = event.originEvent.dataTransfer.getData('text/plain')
      const url = looksLikeUrl(text) ? text : undefined
      const annotation =
        url !== undefined
          ? config.linkAnnotation?.({url, schema: snapshot.context.schema})
          : undefined

      if (annotation && !selectionCollapsed) {
        return {annotation}
      }

      return false
    },
    actions: [
      (_, {annotation}) => [
        {
          type: 'annotation.add',
          annotation,
        },
      ],
    ],
  })
  const pasteLinkAtCaret = defineBehavior({
    on: 'clipboard.paste',
    guard: ({snapshot, event}) => {
      const focusSpan = selectors.getFocusSpan(snapshot)
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      if (!focusSpan || !selectionCollapsed) {
        return false
      }

      const text = event.originEvent.dataTransfer.getData('text/plain')
      const url = looksLikeUrl(text) ? text : undefined
      const annotation =
        url !== undefined
          ? config.linkAnnotation?.({url, schema: snapshot.context.schema})
          : undefined

      if (url && annotation && selectionCollapsed) {
        return {focusSpan, annotation, url}
      }

      return false
    },
    actions: [
      (_, {annotation, url}) => [
        {
          type: 'insert.span',
          text: url,
          annotations: [annotation],
        },
      ],
    ],
  })

  const linkBehaviors = [pasteLinkOnSelection, pasteLinkAtCaret]

  return linkBehaviors
}
