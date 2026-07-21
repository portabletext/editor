import {useEditor} from '@portabletext/editor'
import {defineBehavior, execute, raise} from '@portabletext/editor/behaviors'
import {isSelectionExpanded} from '@portabletext/editor/selectors'
import {useEffect} from 'react'
import type {ToolbarAnnotationSchemaType} from './use-toolbar-schema'

export function useMutuallyExclusiveAnnotation(props: {
  schemaType: ToolbarAnnotationSchemaType
}) {
  const editor = useEditor()

  useEffect(() => {
    const mutuallyExclusive = props.schemaType.mutuallyExclusive

    if (!mutuallyExclusive) {
      // Absent config keeps the Core Behavior default (self-exclusive).
      // An empty array is deliberate "exclusive with nothing" config and
      // must fall through to register; see `mutuallyExclusive`'s docs.
      return
    }

    return editor.registerBehavior({
      behavior: defineBehavior({
        on: 'annotation.add',
        guard: ({snapshot, event}) => {
          if (event.annotation.name !== props.schemaType.name) {
            return false
          }

          // Declining collapsed selections lets the Core Behavior expand
          // them to the caret word and re-raise the add; the re-raised,
          // now-expanded add re-enters this chain and passes this guard.
          // Intercepting the collapsed add directly would `execute` past
          // that expansion and annotate nothing.
          return isSelectionExpanded(snapshot)
        },
        actions: [
          ({event}) => [
            // Unconditional removes: removing an annotation that isn't
            // active is a harmless no-op, while checking activity up
            // front invites the guard-versus-operation disagreement that
            // made `preventOverlappingAnnotations` recurse.
            ...mutuallyExclusive.map((annotation) =>
              raise({
                type: 'annotation.remove',
                annotation: {name: annotation},
              }),
            ),
            // `execute` (not `forward`) is deliberate: it skips the Core
            // Behavior that makes same-type annotations mutually
            // exclusive, so the configured list fully replaces the
            // default. An empty list therefore allows same-type overlap.
            execute(event),
          ],
        ],
      }),
    })
  }, [editor, props.schemaType.name, props.schemaType.mutuallyExclusive])
}
