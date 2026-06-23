import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {htmlToPortableText, type ObjectMatcher} from '@portabletext/html'
import {createFlattenTableRule} from '@portabletext/html/rules'
import {useEffect} from 'react'

const imageMatcher: ObjectMatcher<{src?: string; alt?: string}> = ({
  context,
  value,
  isInline,
}) => {
  const candidates = isInline
    ? context.schema.inlineObjects
    : context.schema.blockObjects

  if (!candidates.some((object) => object.name === 'image')) {
    return undefined
  }

  return {
    _type: 'image',
    _key: context.keyGenerator(),
    ...(value.src ? {src: value.src} : {}),
    ...(value.alt ? {alt: value.alt} : {}),
  }
}

// Map html→pt's flat `{_type:'code', code:'a\nb\nc', language?}` into
// the playground's editable code-block container shape. Each source line
// becomes its own text block inside `lines` (the same shape produced by
// MarkdownDeserializerPlugin's `code` matcher).
const codeMatcher: ObjectMatcher<{
  language: string | undefined
  code: string
}> = ({context, value}) => {
  if (
    !context.schema.blockObjects.some((object) => object.name === 'code-block')
  ) {
    return undefined
  }

  const lines = value.code.split('\n').map((text) => ({
    _type: 'block',
    _key: context.keyGenerator(),
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: context.keyGenerator(),
        text,
        marks: [],
      },
    ],
    markDefs: [],
  }))

  return {
    _type: 'code-block',
    _key: context.keyGenerator(),
    lines,
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

          const blocks = htmlToPortableText(event.data, {
            schema: snapshot.context.schema,
            keyGenerator: snapshot.context.keyGenerator,
            types: {
              image: imageMatcher,
              code: codeMatcher,
            },
            rules: [
              createFlattenTableRule({
                schema: snapshot.context.schema,
                separator: () => ({_type: 'span', text: ': '}),
              }),
            ],
            whitespaceMode: 'normalize',
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
