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
import {schema} from './schema'

export function Editor() {
  return (
    <PortableTextEditor onChange={() => {}} schemaType={schema}>
      <PortableTextEditable
        renderAnnotation={renderAnnotation}
        renderBlock={renderBlock}
        renderChild={renderChild}
        renderDecorator={renderDecorator}
        renderListItem={renderListItem}
        renderPlaceholder={renderPlaceholder}
        renderStyle={renderStyle}
      />
    </PortableTextEditor>
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
