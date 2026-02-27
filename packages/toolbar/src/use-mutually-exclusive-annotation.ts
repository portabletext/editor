import {useEditor} from '@portabletext/editor'
import {defineBehavior, execute, raise} from '@portabletext/editor/behaviors'
import {isActiveAnnotation} from '@portabletext/editor/selectors'
import {useEffect} from 'react'
import type {ToolbarAnnotationSchemaType} from './use-toolbar-schema'

export function useMutuallyExclusiveAnnotation(props: {
  schemaType: ToolbarAnnotationSchemaType
}) {
  const editor = useEditor()

  useEffect(() => {
    const mutuallyExclusive = props.schemaType.mutuallyExclusive

    if (!mutuallyExclusive) {
      return
    }

    return editor.registerBehavior({
      behavior: defineBehavior({
        name: `toolbar:mutuallyExclusiveAnnotation:${props.schemaType.name}`,
        on: 'annotation.add',
        guard: ({snapshot, event}) => {
          if (event.annotation.name !== props.schemaType.name) {
            return false
          }

          const activeMutuallyExclusive = mutuallyExclusive.filter(
            (annotation) =>
              isActiveAnnotation(annotation, {mode: 'partial'})(snapshot),
          )

          return {activeMutuallyExclusive}
        },
        actions: [
          ({event}, {activeMutuallyExclusive}) => [
            ...activeMutuallyExclusive.map((annotation) =>
              raise({
                type: 'annotation.remove',
                annotation: {name: annotation},
              }),
            ),
            execute(event),
          ],
        ],
      }),
    })
  }, [editor, props.schemaType.name, props.schemaType.mutuallyExclusive])
}
