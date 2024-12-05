import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import {defineBehavior} from './behavior.types'
import {getFocusSpan, selectionIsCollapsed} from './behavior.utils'

/**
 * @alpha
 */
export type LinkBehaviorsConfig = {
  linkAnnotation?: (context: {
    schema: PortableTextMemberSchemaTypes
    url: string
  }) => {name: string; value: {[prop: string]: unknown}} | undefined
}

/**
 * @alpha
 */
export function createLinkBehaviors(config: LinkBehaviorsConfig) {
  const pasteLinkOnSelection = defineBehavior({
    on: 'paste',
    guard: ({state, event}) => {
      const selectionCollapsed = selectionIsCollapsed(state)
      const text = event.data.getData('text/plain')
      const url = looksLikeUrl(text) ? text : undefined
      const annotation =
        url !== undefined
          ? config.linkAnnotation?.({url, schema: state.schema})
          : undefined

      if (annotation && !selectionCollapsed) {
        return {annotation}
      }

      return false
    },
    actions: [
      ({annotation}) => [
        {
          type: 'annotation.add',
          annotation,
        },
      ],
    ],
  })
  const pasteLinkAtCaret = defineBehavior({
    on: 'paste',
    guard: ({state, event}) => {
      const focusSpan = getFocusSpan(state)
      const selectionCollapsed = selectionIsCollapsed(state)

      if (!focusSpan || !selectionCollapsed) {
        return false
      }

      const text = event.data.getData('text/plain')
      const url = looksLikeUrl(text) ? text : undefined
      const annotation =
        url !== undefined
          ? config.linkAnnotation?.({url, schema: state.schema})
          : undefined

      if (url && annotation && selectionCollapsed) {
        return {focusSpan, annotation, url}
      }

      return false
    },
    actions: [
      ({annotation, url}) => [
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
