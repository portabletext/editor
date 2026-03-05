import type {EditorContext} from '@portabletext/editor'
import {useEditor} from '@portabletext/editor'
import {
  defineBehavior,
  raise,
  type BehaviorGuard,
  type NativeBehaviorEvent,
} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
import {useEffect} from 'react'
import {looksLikeUrl} from './looks-like-url'

/**
 * Guard function that controls when the paste link behavior runs.
 * Return `false` to skip the behavior and fall through to default paste handling.
 * @public
 */
export type PasteLinkGuard = BehaviorGuard<
  Extract<NativeBehaviorEvent, {type: 'clipboard.paste'}>,
  true
>

/**
 * Context provided to link matchers.
 * @public
 */
export type LinkMatcherContext = Pick<EditorContext, 'schema' | 'keyGenerator'>

/**
 * Value provided to link matchers.
 * @public
 */
export type LinkMatcherValue = {href: string}

/**
 * Object returned by link matchers.
 * @public
 */
export type LinkMatcherResult = {
  _type: string
  _key?: string
  [other: string]: unknown
}

/**
 * Function that converts a pasted URL into a link annotation.
 * Return `undefined` to skip handling.
 * @public
 */
export type LinkMatcher = (params: {
  context: LinkMatcherContext
  value: LinkMatcherValue
}) => LinkMatcherResult | undefined

/**
 * @public
 */
export type PasteLinkPluginProps = {
  guard?: PasteLinkGuard
  link?: LinkMatcher
}

const defaultLinkMatcher: LinkMatcher = ({context, value}) => {
  const schemaType = context.schema.annotations.find(
    (annotation) => annotation.name === 'link',
  )
  const hrefField = schemaType?.fields.find(
    (field) => field.name === 'href' && field.type === 'string',
  )

  if (!schemaType || !hrefField) {
    return undefined
  }

  return {
    _type: schemaType.name,
    [hrefField.name]: value.href,
  }
}

/**
 * Plugin that handles pasting URLs in the editor.
 *
 * When text is selected and a URL is pasted, adds a link annotation to the selection.
 * When the caret is collapsed (no selection) and a URL is pasted, inserts the URL as text with a link annotation.
 *
 * @public
 */
export function PasteLinkPlugin({
  guard,
  link = defaultLinkMatcher,
}: PasteLinkPluginProps) {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createPasteLinkBehaviors({guard, link})
    const unregisterBehaviors = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor, guard, link])

  return null
}

function createPasteLinkBehaviors(
  config: Required<Pick<PasteLinkPluginProps, 'link'>> &
    Pick<PasteLinkPluginProps, 'guard'>,
) {
  /**
   * When text is selected and a URL is pasted, add a link annotation to the
   * selection. If the selection already has a link annotation, the core
   * `preventOverlappingAnnotations` behavior will remove it first.
   */
  const pasteLinkOnSelection = defineBehavior({
    name: 'pasteLinkOnSelection',
    on: 'clipboard.paste',
    guard: (guardParams) => {
      if (config.guard && config.guard(guardParams) === false) {
        return false
      }

      const {snapshot, event} = guardParams
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      if (selectionCollapsed) {
        return false
      }

      const text = event.originEvent.dataTransfer.getData('text/plain')
      const href = looksLikeUrl(text) ? text : undefined

      if (!href) {
        return false
      }

      const result = config.link({
        context: {
          schema: snapshot.context.schema,
          keyGenerator: snapshot.context.keyGenerator,
        },
        value: {href},
      })

      if (!result) {
        return false
      }

      const {_type, _key, ...value} = result

      return {annotation: {name: _type, _key, value}}
    },
    actions: [
      (_, {annotation}) => [
        raise({
          type: 'annotation.add',
          annotation,
        }),
      ],
    ],
  })

  /**
   * When the caret is collapsed (no selection) and a URL is pasted, insert the
   * URL as text with a link annotation. Existing decorators (bold, italic,
   * etc.) are preserved.
   */
  const pasteLinkAtCaret = defineBehavior({
    name: 'pasteLinkAtCaret',
    on: 'clipboard.paste',
    guard: (guardParams) => {
      if (config.guard && config.guard(guardParams) === false) {
        return false
      }

      const {snapshot, event} = guardParams
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)
      const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

      if (!focusTextBlock || !selectionCollapsed) {
        return false
      }

      const text = event.originEvent.dataTransfer.getData('text/plain')
      const href = looksLikeUrl(text) ? text : undefined

      if (!href) {
        return false
      }

      const result = config.link({
        context: {
          schema: snapshot.context.schema,
          keyGenerator: snapshot.context.keyGenerator,
        },
        value: {href},
      })

      if (!result) {
        return false
      }

      const {_type, _key, ...value} = result

      const markState = selectors.getMarkState(snapshot)
      const decoratorNames = snapshot.context.schema.decorators.map(
        (decorator) => decorator.name,
      )
      const activeDecorators = (markState?.marks ?? []).filter((mark) =>
        decoratorNames.includes(mark),
      )

      const markDefKey = _key ?? snapshot.context.keyGenerator()
      const markDef = {
        _type,
        _key: markDefKey,
        ...value,
      }

      return {
        focusTextBlock,
        markDef,
        markDefKey,
        href,
        activeDecorators,
      }
    },
    actions: [
      (
        {snapshot},
        {focusTextBlock, markDef, markDefKey, href, activeDecorators},
      ) => [
        raise({
          type: 'block.set',
          at: focusTextBlock.path,
          props: {
            markDefs: [...(focusTextBlock.node.markDefs ?? []), markDef],
          },
        }),
        raise({
          type: 'insert.child',
          child: {
            _type: snapshot.context.schema.span.name,
            text: href,
            marks: [...activeDecorators, markDefKey],
          },
        }),
      ],
    ],
  })

  return [pasteLinkOnSelection, pasteLinkAtCaret]
}
