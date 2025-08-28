import {htmlToBlocks, type ImageSchemaMatcher} from '@portabletext/block-tools'
import {createFlattenTableRule} from '@portabletext/block-tools/rules'
import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {useEffect} from 'react'

const imageMatcher: ImageSchemaMatcher = ({context, props}) => {
  if (
    !context.schema.blockObjects.some(
      (blockObject) => blockObject.name === 'image',
    )
  ) {
    return undefined
  }

  return {
    _type: 'image',
    ...(props.src ? {src: props.src} : {}),
    ...(props.alt ? {alt: props.alt} : {}),
  }
}

const inlineImageMatcher: ImageSchemaMatcher = ({context, props}) => {
  if (
    !context.schema.inlineObjects.some(
      (inlineObject) => inlineObject.name === 'image',
    )
  ) {
    return undefined
  }

  return {
    _type: 'image',
    ...(props.src ? {src: props.src} : {}),
    ...(props.alt ? {alt: props.alt} : {}),
  }
}

export function HtmlDeserializerPlugin() {
  const editor = useEditor()

  useEffect(() => {
    return editor.registerBehavior({
      behavior: defineBehavior({
        on: 'deserialize.data',
        guard: ({snapshot, event}) => {
          if (event.mimeType !== 'text/html') {
            return false
          }

          const blocks = htmlToBlocks(event.data, snapshot.context.schema, {
            keyGenerator: snapshot.context.keyGenerator,
            matchers: {
              image: imageMatcher,
              inlineImage: inlineImageMatcher,
            },
            rules: [
              createFlattenTableRule({
                schema: snapshot.context.schema,
                separator: () => ({_type: 'span', text: ': '}),
              }),
            ],
          })

          return {blocks}
        },
        actions: [
          ({event}, {blocks}) =>
            blocks.length > 0
              ? [
                  raise({
                    ...event,
                    type: 'deserialization.success',
                    data: blocks,
                  }),
                ]
              : [
                  raise({
                    ...event,
                    reason: '',
                    type: 'deserialization.failure',
                  }),
                ],
        ],
      }),
    })
  }, [editor])

  return null
}
