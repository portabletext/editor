import {defineLeaf} from '@portabletext/editor'
import {LeafPlugin} from '@portabletext/editor/plugins'

const horizontalRuleLeaf = defineLeaf({
  type: 'horizontal-rule',
  render: ({attributes, children, focused, readOnly, selected}) => {
    const stateClass =
      (selected ? ' pc-hr-selected' : '') + (focused ? ' pc-hr-focused' : '')
    return (
      <div {...attributes} className="pc-hr-wrapper">
        {children}
        <div
          contentEditable={false}
          draggable={!readOnly}
          className={`pc-hr-inner${stateClass}`}
        >
          <hr className="pc-hr" />
        </div>
      </div>
    )
  },
})

export function HorizontalRulePlugin() {
  return <LeafPlugin leaves={[horizontalRuleLeaf]} />
}
