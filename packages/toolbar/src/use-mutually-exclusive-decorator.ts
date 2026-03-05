import {useEditor} from '@portabletext/editor'
import {defineBehavior, forward, raise} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'
import type {ToolbarDecoratorSchemaType} from './use-toolbar-schema'

export function useMutuallyExclusiveDecorator(props: {
  schemaType: ToolbarDecoratorSchemaType
}) {
  const editor = useEditor()

  useEffect(() => {
    const mutuallyExclusive = props.schemaType.mutuallyExclusive

    if (!mutuallyExclusive) {
      return
    }

    return editor.registerBehavior({
      behavior: defineBehavior({
        name: `toolbar:mutuallyExclusiveDecorator:${props.schemaType.name}`,
        on: 'decorator.add',
        guard: ({event}) => event.decorator === props.schemaType.name,
        actions: [
          ({event}) => [
            forward(event),
            ...mutuallyExclusive.map((decorator) =>
              raise({
                type: 'decorator.remove',
                decorator,
              }),
            ),
          ],
        ],
      }),
    })
  }, [editor, props.schemaType.name, props.schemaType.mutuallyExclusive])
}
