import type {EditorSchema} from '../editor/define-schema'
import {getFocusSpan, selectionIsCollapsed} from '../selectors/selectors'
import {defineBehavior} from './behavior.types'

/**
 * @alpha
 */
export type LinkBehaviorsConfig = {
  linkAnnotation?: (context: {
    schema: EditorSchema
    url: string
  }) => {name: string; value: {[prop: string]: unknown}} | undefined
}

/**
 * @alpha
 */
export function createLinkBehaviors(config: LinkBehaviorsConfig) {
  const pasteLinkOnSelection = defineBehavior({
    on: 'paste',
    guard: ({context, event}) => {
      const selectionCollapsed = selectionIsCollapsed({context})
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
      const focusSpan = getFocusSpan({context})
      const selectionCollapsed = selectionIsCollapsed({context})

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

function looksLikeUrl(text: string) {
  let looksLikeUrl = false
  try {
    new URL(text)
    looksLikeUrl = true
  } catch {}
  return looksLikeUrl
}
