import {useEditor, type DecoratorDefinition} from '@portabletext/editor'
import {defineBehavior, forward, raise} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'

export function useMutuallyExclusiveDecorator(props: {
  definition: Pick<DecoratorDefinition, 'name'> & {
    mutuallyExclusive?: ReadonlyArray<DecoratorDefinition['name']>
  }
}) {
  const editor = useEditor()

  useEffect(() => {
    const mutuallyExclusive = props.definition.mutuallyExclusive

    if (!mutuallyExclusive) {
      return
    }

    return editor.registerBehavior({
      behavior: defineBehavior({
        on: 'decorator.add',
        guard: ({event}) => event.decorator === props.definition.name,
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
  }, [editor, props.definition.name, props.definition.mutuallyExclusive])
}
