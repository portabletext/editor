import {defineContainer} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'

const codeBlockContainer = defineContainer({
  type: 'code-block',
  arrayField: 'lines',
  render: ({attributes, children, node}) => {
    const block = node as {language?: string}
    return (
      <div {...attributes} className="pc-code-block">
        <header className="pc-code-block-head" contentEditable={false}>
          <span className="pc-code-block-lang">
            {block.language ?? 'plain'}
          </span>
        </header>
        <div className="pc-code-block-body">{children}</div>
      </div>
    )
  },
})

export function CodeBlockPlugin() {
  return <NodePlugin nodes={[codeBlockContainer]} />
}
