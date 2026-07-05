import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {Path} from '../engine/interfaces/path'
import type {RenderElementProps} from '../engine/react/components/editable'
import {serializePath} from '../paths/serialize-path'
import type {
  ContainerConfig,
  ContainerRenderProps,
} from '../renderers/renderer.types'
import {renderDefaultContainer} from './render.default'
import {
  useIsFocusedContainer,
  useIsSelectedContainer,
} from './selection-state-context'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextBlock
  containerConfig: ContainerConfig
  path: Path
  readOnly: boolean
}) {
  const serializedPath = serializePath(props.path)
  const focused = useIsFocusedContainer(serializedPath)
  const selected = useIsSelectedContainer(serializedPath)
  const render = props.containerConfig.container.render

  // Container registrations forbid the `'block'` and `'span'` types
  // at the factory level (see `ContainerNodeForType`), so a container
  // node here is always a `PortableTextObject`. The runtime invariant
  // is enforced by registration; expressing it in the type graph
  // would require threading the `_type` literal through dispatch.
  const renderProps: ContainerRenderProps = {
    attributes: props.attributes,
    spacer: (
      <span
        // The void selection-spacer markers; the engine tells it apart
        // from voids' and the body's spacers by its nearest `data-pt-block`
        // being a container. Unlike a void's anchor-only spacer, a
        // container has an editable body that competes for clicks, so this
        // one fills the region it is placed in (`inset: 0`); the consumer
        // layers the editable content above it.
        data-pt-spacer=""
        style={{
          position: 'absolute',
          inset: 0,
          color: 'transparent',
          outline: 'none',
        }}
      >
        <span>
          <span data-pt-marks="">
            <span data-pt-zero-width="">{'\uFEFF'}</span>
          </span>
        </span>
      </span>
    ),
    children: props.children,
    focused,
    node: props.element as PortableTextObject,
    path: props.path,
    readOnly: props.readOnly,
    renderDefault: renderDefaultContainer,
    selected,
  }

  return render ? render(renderProps) : renderDefaultContainer(renderProps)
}
