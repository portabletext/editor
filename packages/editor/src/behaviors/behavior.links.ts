import type {EditorSchema} from '../editor/define-schema'
import * as selectors from '../selectors'
import {looksLikeUrl} from '../utils/looks-like-url'
import {defineBehavior} from './behavior.types'

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
    on: 'paste',
    guard: ({context, event}) => {
      const selectionCollapsed = selectors.isSelectionCollapsed({context})
      const text = event.data.getData('text/plain')
      const url = looksLikeUrl(text) ? text : undefined
      const annotation =
        url !== undefined
          ? config.linkAnnotation?.({url, schema: context.schema})
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
    on: 'paste',
    guard: ({context, event}) => {
      const focusSpan = selectors.getFocusSpan({context})
      const selectionCollapsed = selectors.isSelectionCollapsed({context})

      if (!focusSpan || !selectionCollapsed) {
        return false
      }

      const text = event.data.getData('text/plain')
      const url = looksLikeUrl(text) ? text : undefined
      const annotation =
        url !== undefined
          ? config.linkAnnotation?.({url, schema: context.schema})
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
