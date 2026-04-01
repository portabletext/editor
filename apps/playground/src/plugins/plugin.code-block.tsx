import {RendererPlugin} from '@portabletext/editor/plugins'
import {defineRenderer, type Renderer} from '@portabletext/editor/renderers'

const codeBlockRenderer: Renderer = defineRenderer({
  type: 'code-block',
  render: ({attributes, children}) => (
    <pre
      {...attributes}
      style={{
        backgroundColor: '#1e1e2e',
        color: '#cdd6f4',
        padding: '1rem',
        borderRadius: '0.5rem',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        overflow: 'auto',
        margin: '0.25rem 0',
      }}
    >
      <code>{children}</code>
    </pre>
  ),
})

export function CodeBlockPlugin() {
  return <RendererPlugin renderers={[codeBlockRenderer]} />
}
