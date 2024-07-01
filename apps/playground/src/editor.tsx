import {
  BlockDecoratorRenderProps,
  Patch,
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
import {RemoveIcon} from '@sanity/icons'
import {PortableTextBlock} from '@sanity/types'
import {Badge, Button, Card, Flex, Inline, Spinner} from '@sanity/ui'
import {useSelector} from '@xstate/react'
import {useMemo, useState} from 'react'
import {Subject} from 'rxjs'
import {EditorActorRef} from './playground-machine'
import {schema} from './schema'
import {SelectionPreview} from './selection-preview'
import {Toolbar} from './toolbar'
import {wait} from './wait'

export function Editor(props: {editorRef: EditorActorRef}) {
  const color = useSelector(props.editorRef, (s) => s.context.color)
  const value = useSelector(props.editorRef, (s) => s.context.value)
  const patches$ = useMemo(
    () =>
      new Subject<{
        patches: Array<Patch>
        snapshot: Array<PortableTextBlock> | undefined
      }>(),
    [],
  )
  const [loading, setLoading] = useState(false)

  return (
    <Card border padding={2} style={{backgroundColor: color}}>
      <PortableTextEditor
        value={value}
        patches$={patches$}
        onChange={(change) => {
          if (change.type === 'mutation') {
            props.editorRef.send(change)
          }
          if (change.type === 'loading') {
            setLoading(change.isLoading)
          }
        }}
        schemaType={schema}
      >
        <Flex direction="column" gap={2}>
          <Card border padding={1}>
            <Inline space={[2]}>
              <Badge tone="primary">ID: {props.editorRef.id}</Badge>
              <Button
                mode="ghost"
                icon={RemoveIcon}
                text="Remove"
                onClick={() => {
                  props.editorRef.send({type: 'remove'})
                }}
              />
            </Inline>
          </Card>
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
