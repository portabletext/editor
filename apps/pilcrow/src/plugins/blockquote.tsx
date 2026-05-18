import {defineContainer} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'

const blockquoteContainer = defineContainer({
  type: 'blockquote',
  arrayField: 'content',
  render: ({attributes, children}) => (
    <blockquote {...attributes} className="pc-blockquote">
      {children}
    </blockquote>
  ),
})

export function BlockquotePlugin() {
  return <NodePlugin nodes={[blockquoteContainer]} />
}
