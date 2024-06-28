import {
  BlockDecoratorRenderProps,
  PortableTextEditable,
  PortableTextEditor,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderListItemFunction,
  RenderPlaceholderFunction,
  RenderStyleFunction,
} from '@portabletext/editor'
import {Card, CardTone, Flex, Spinner} from '@sanity/ui'
import {useSelector} from '@xstate/react'
import {useState} from 'react'
import {editorActor} from './editor-actor'
import {schema} from './schema'
import {SelectionPreview} from './selection-preview'
import {Toolbar} from './toolbar'
import {wait} from './wait'

export function Editor(props: {tone: CardTone}) {
  const [loading, setLoading] = useState(false)
  const value = useSelector(editorActor, (s) => s.context.value)

  return (
    <Card border padding={2} tone={props.tone}>
      <PortableTextEditor
        value={value}
        onChange={(change) => {
          if (change.type === 'mutation') {
            editorActor.send(change)
          }
          if (change.type === 'loading') {
            setLoading(change.isLoading)
          }
        }}
        schemaType={schema}
      >
        <Flex direction="column" gap={2}>
          <Toolbar />
          <Flex gap={2} align="center">
            <Card flex={1} border padding={2}>
              <PortableTextEditable
                onPaste={(data) => {
                  const text = data.event.clipboardData.getData('text')
                  if (text === 'heading') {
                    return wait(2000).then(() => ({
                      insert: [
                        {
                          _type: 'block',
                          children: [{_type: 'span', text: 'heading'}],
                          style: 'h1',
                        },
                      ],
                    }))
                  }
                }}
                renderAnnotation={renderAnnotation}
                renderBlock={renderBlock}
                renderChild={renderChild}
                renderDecorator={renderDecorator}
                renderListItem={renderListItem}
                renderPlaceholder={renderPlaceholder}
                renderStyle={renderStyle}
              />
            </Card>
            {loading ? <Spinner /> : null}
          </Flex>
          <SelectionPreview />
        </Flex>
      </PortableTextEditor>
    </Card>
  )
}

const renderAnnotation: RenderAnnotationFunction = (props) => {
  return props.children
}

const renderBlock: RenderBlockFunction = (props) => {
  return props.children
}

const renderDecorator: RenderDecoratorFunction = (props) => {
  return (decoratorMap.get(props.value) ?? ((props) => props.children))(props)
}

const renderChild: RenderChildFunction = (props) => {
  return props.children
}

const renderListItem: RenderListItemFunction = (props) => {
  return props.children
}

const renderPlaceholder: RenderPlaceholderFunction = () => (
  <span style={{color: 'var(--card-muted-fg-color)'}}>Type something</span>
)

const renderStyle: RenderStyleFunction = (props) => {
  return props.children
}

const decoratorMap: Map<string, (props: BlockDecoratorRenderProps) => JSX.Element> = new Map([
  ['strong', (props) => <strong>{props.children}</strong>],
  ['em', (props) => <em>{props.children}</em>],
  ['code', (props) => <code>{props.children}</code>],
  ['underline', (props) => <span style={{textDecoration: 'underline'}}>{props.children}</span>],
  [
    'strike-through',
    (props) => <span style={{textDecorationLine: 'line-through'}}>{props.children}</span>,
  ],
])
