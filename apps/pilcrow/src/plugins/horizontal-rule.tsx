import {defineLeaf} from '@portabletext/editor'
import {LeafPlugin} from '@portabletext/editor/plugins'

const horizontalRuleLeaf = defineLeaf({
  type: 'horizontal-rule',
  render: ({attributes, children, selected, focused}) => (
    <div
      {...attributes}
      className="pc-block"
      data-selected={selected || undefined}
      data-focused={focused || undefined}
    >
      <hr className="pc-hr" contentEditable={false} />
      {children}
    </div>
  ),
})

export function HorizontalRulePlugin() {
  return <LeafPlugin leaves={[horizontalRuleLeaf]} />
}
