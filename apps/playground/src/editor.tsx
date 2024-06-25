import {
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
import {PortableTextBlock} from '@sanity/types'
import {schema} from './schema'
import {useState} from 'react'
import {applyAll} from '@portabletext/patches/apply'
import {Code, Stack} from '@sanity/ui'
import {wait} from './wait'

export function Editor() {
  const [value, setValue] = useState<Array<PortableTextBlock>>([])

  return (
    <Stack space={2}>
      <PortableTextEditor
        onChange={(change) => {
          if (change.type === 'mutation') {
            setValue(applyAll(value, change.patches))
          }
        }}
        schemaType={schema}
      >
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
      </PortableTextEditor>
      <Code as="code" size={0} language="json">
        {JSON.stringify(value, null, 2)}
      </Code>
    </Stack>
  )
}

const renderAnnotation: RenderAnnotationFunction = (props) => {
  return props.children
}

const renderBlock: RenderBlockFunction = (props) => {
  return props.children
}

const renderDecorator: RenderDecoratorFunction = (props) => {
  return props.children
}

const renderChild: RenderChildFunction = (props) => {
  return props.children
}

const renderListItem: RenderListItemFunction = (props) => {
  return props.children
}

const renderPlaceholder: RenderPlaceholderFunction = () => 'Type something'

const renderStyle: RenderStyleFunction = (props) => {
  return props.children
}
