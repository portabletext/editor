import {defineContainer} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {createContext, useContext} from 'react'

type Kind = 'bullet' | 'number' | 'task'

const ListKindContext = createContext<Kind>('bullet')

function isKind(value: string): value is Kind {
  return value === 'bullet' || value === 'number' || value === 'task'
}

const listItemContainer = defineContainer({
  type: 'list-item',
  arrayField: 'content',
  render: ({attributes, children, node}) => {
    const kind = useContext(ListKindContext)
    const item = node as {checked?: boolean}
    return (
      <li {...attributes} className="pc-li">
        {kind === 'task' ? (
          <span
            className="pc-task-checkbox"
            data-checked={item.checked ? 'true' : 'false'}
            contentEditable={false}
            aria-hidden
          />
        ) : null}
        {children}
      </li>
    )
  },
})

const listContainer = defineContainer({
  type: 'list',
  arrayField: 'items',
  render: ({attributes, children, node}) => {
    const list = node as {kind?: string}
    const rawKind = list.kind ?? 'bullet'
    const kind: Kind = isKind(rawKind) ? rawKind : 'bullet'
    const Tag = kind === 'number' ? 'ol' : 'ul'
    return (
      <ListKindContext.Provider value={kind}>
        <Tag {...attributes} className="pc-list" data-kind={kind}>
          {children}
        </Tag>
      </ListKindContext.Provider>
    )
  },
  of: [listItemContainer],
})

export function StructuredListsPlugin() {
  return <NodePlugin nodes={[listContainer]} />
}
