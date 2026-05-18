import {defineBlockObject} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'

/**
 * Horizontal rule leaf. The visible rule is 1px, which makes for an
 * impossibly thin click target. The outer wrapper carries the
 * selection state and gives a generous transparent hit area around
 * the rule (CSS adds vertical padding offset by negative margin so
 * surrounding layout is preserved).
 */
const horizontalRule = defineBlockObject({
  type: 'horizontal-rule',
  render: ({attributes, children, selected, focused}) => (
    <div
      {...attributes}
      className="pc-hr-wrap"
      data-selected={selected || undefined}
      data-focused={focused || undefined}
    >
      <hr className="pc-hr" contentEditable={false} />
      {children}
    </div>
  ),
})

export function HorizontalRulePlugin() {
  return <NodePlugin nodes={[horizontalRule]} />
}
