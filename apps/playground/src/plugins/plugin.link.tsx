import {useEditor} from '@portabletext/editor'
import {useEffect} from 'react'
import {createLinkBehaviors} from './behavior.links'

export function LinkPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createLinkBehaviors({
      linkAnnotation: ({schema, url}) => {
        const name = schema.annotations.find(
          (annotation) => annotation.name === 'link',
        )?.name
        return name ? {name, value: {href: url}} : undefined
      },
    })

    const unregisterBehaviors = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor])

  return null
}
