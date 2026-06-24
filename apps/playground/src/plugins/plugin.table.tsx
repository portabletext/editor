import {defineContainer, defineTextBlock} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import {BlockDropIndicator} from './block-drop-indicator'
import {ContainerTextBlock} from './container-text-block'
import {DragHandle} from './drag-handle'
import {calloutContainer} from './plugin.callout'
import {cellImageLeaf} from './plugin.image'

const cellTextStyles = {normal: {tag: 'div', className: ''}} as const

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({attributes, children, node, path, readOnly, selected}) => (
    <div
      {...attributes}
      data-header-rows={
        typeof node.headerRows === 'number' ? node.headerRows : 0
      }
      data-selected={selected ? '' : undefined}
      className="playground-table-chrome group"
    >
      <table className="playground-table cursor-text">
        <tbody>{children}</tbody>
      </table>
      <DragHandle readOnly={readOnly} />
      <BlockDropIndicator path={path} />
    </div>
  ),
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({attributes, children, selected}) => (
        <tr {...attributes} data-selected={selected ? '' : undefined}>
          {children}
        </tr>
      ),
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'content',
          render: ({attributes, children, selected}) => (
            <td {...attributes} data-selected={selected ? '' : undefined}>
              {children}
            </td>
          ),
          of: [
            defineTextBlock({
              type: 'block',
              render: ({attributes, children, node, path}) => (
                <ContainerTextBlock
                  attributes={attributes}
                  node={node}
                  path={path}
                  styles={cellTextStyles}
                  children={children}
                />
              ),
            }),
            cellImageLeaf,
            calloutContainer,
          ],
        }),
      ],
    }),
  ],
})

export function TablePlugin(): JSX.Element {
  return <NodePlugin nodes={[tableContainer]} />
}
