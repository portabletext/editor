import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'

const blockquoteContainer = defineContainer({
  type: 'blockquote',
  childField: 'content',
  render: ({attributes, children}) => (
    <blockquote {...attributes} className="pc-blockquote">
      {children}
    </blockquote>
  ),
})

export function BlockquotePlugin() {
  return <ContainerPlugin containers={[blockquoteContainer]} />
}
