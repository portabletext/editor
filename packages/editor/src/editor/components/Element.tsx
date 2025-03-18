import type {
  Path,
  PortableTextChild,
  PortableTextObject,
  PortableTextTextBlock,
} from '@sanity/types'
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FunctionComponent,
  type JSX,
  type ReactElement,
} from 'react'
import {Editor, Range, Element as SlateElement} from 'slate'
import {
  ReactEditor,
  useSelected,
  useSlateStatic,
  type RenderElementProps,
} from 'slate-react'
import {defineBehavior} from '../../behaviors'
import {debugWithName} from '../../internal-utils/debug'
import type {EventPositionBlock} from '../../internal-utils/event-position'
import {fromSlateValue} from '../../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../../internal-utils/weakMaps'
import * as selectors from '../../selectors'
import type {
  BlockRenderProps,
  PortableTextMemberSchemaTypes,
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {DefaultBlockObject, DefaultInlineObject} from './DefaultObject'
import {DropIndicator} from './drop-indicator'

const debug = debugWithName('components:Element')
const debugRenders = false
const EMPTY_ANNOTATIONS: PortableTextObject[] = []

/**
 * @internal
 */
export interface ElementProps {
  attributes: RenderElementProps['attributes']
  children: ReactElement<any>
  element: SlateElement
  schemaTypes: PortableTextMemberSchemaTypes
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  spellCheck?: boolean
}

const inlineBlockStyle = {display: 'inline-block'}

/**
 * Renders Portable Text block and inline object nodes in Slate
 * @internal
 */
export const Element: FunctionComponent<ElementProps> = ({
  attributes,
  children,
  element,
  schemaTypes,
  readOnly,
  renderBlock,
  renderChild,
  renderListItem,
  renderStyle,
  spellCheck,
}) => {
  const editorActor = useContext(EditorActorContext)
  const slateEditor = useSlateStatic()
  const selected = useSelected()
  const blockRef = useRef<HTMLDivElement | null>(null)
  const inlineBlockObjectRef = useRef(null)
  const focused =
    (selected &&
      slateEditor.selection &&
      Range.isCollapsed(slateEditor.selection)) ||
    false
  const [dragPositionBlock, setDragPositionBlock] =
    useState<EventPositionBlock>()

  useEffect(() => {
    const behavior = defineBehavior({
      on: 'drag.dragover',
      guard: ({snapshot, event}) => {
        const dropFocusBlock = selectors.getFocusBlock({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: event.position.selection,
          },
        })

        if (!dropFocusBlock || dropFocusBlock.node._key !== element._key) {
          return false
        }

        const dragOrigin = snapshot.beta.internalDrag?.origin

        if (!dragOrigin) {
          return false
        }

        const draggedBlocks = selectors.getSelectedBlocks({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: dragOrigin.selection,
          },
        })

        if (
          draggedBlocks.some(
            (draggedBlock) => draggedBlock.node._key === element._key,
          )
        ) {
          return false
        }

        const draggingEntireBlocks = selectors.isSelectingEntireBlocks({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: dragOrigin.selection,
          },
        })

        return draggingEntireBlocks
      },
      actions: [
        ({event}) => [
          {
            type: 'effect',
            effect: () => {
              setDragPositionBlock(event.position.block)
            },
          },
          {
            type: 'noop',
          },
        ],
      ],
    })

    editorActor.send({
      type: 'add behavior',
      behavior,
    })

    return () => {
      editorActor.send({
        type: 'remove behavior',
        behavior,
      })
    }
  }, [editorActor, element._key])

  useEffect(() => {
    const behavior = defineBehavior({
      on: 'drag.*',
      guard: ({event}) => {
        return event.type !== 'drag.dragover'
      },
      actions: [
        () => [
          {
            type: 'effect',
            effect: () => {
              setDragPositionBlock(undefined)
            },
          },
        ],
      ],
    })

    editorActor.send({
      type: 'add behavior',
      behavior,
    })

    return () => {
      editorActor.send({
        type: 'remove behavior',
        behavior,
      })
    }
  }, [editorActor])

  const value = useMemo(
    () =>
      fromSlateValue(
        [element],
        schemaTypes.block.name,
        KEY_TO_VALUE_ELEMENT.get(slateEditor),
      )[0],
    [slateEditor, element, schemaTypes.block.name],
  )

  let renderedBlock = children

  let className: string | undefined

  const blockPath: Path = useMemo(() => [{_key: element._key}], [element])

  if (typeof element._type !== 'string') {
    throw new Error(`Expected element to have a _type property`)
  }

  if (typeof element._key !== 'string') {
    throw new Error(`Expected element to have a _key property`)
  }

  // Test for inline objects first
  if (slateEditor.isInline(element)) {
    const path = ReactEditor.findPath(slateEditor, element)
    const [block] = Editor.node(slateEditor, path, {depth: 1})
    const schemaType = schemaTypes.inlineObjects.find(
      (_type) => _type.name === element._type,
    )
    if (!schemaType) {
      throw new Error('Could not find type for inline block element')
    }
    if (SlateElement.isElement(block)) {
      const elmPath: Path = [
        {_key: block._key},
        'children',
        {_key: element._key},
      ]
      if (debugRenders) {
        debug(`Render ${element._key} (inline object)`)
      }
      return (
        <span {...attributes}>
          {/* Note that children must follow immediately or cut and selections will not work properly in Chrome. */}
          {children}
          <span
            draggable={!readOnly}
            className="pt-inline-object"
            data-testid="pt-inline-object"
            ref={inlineBlockObjectRef}
            key={element._key}
            style={inlineBlockStyle}
            contentEditable={false}
          >
            {renderChild &&
              renderChild({
                annotations: EMPTY_ANNOTATIONS, // These inline objects currently doesn't support annotations. This is a limitation of the current PT spec/model.
                children: <DefaultInlineObject value={value} />,
                editorElementRef: inlineBlockObjectRef,
                focused,
                path: elmPath,
                schemaType,
                selected,
                type: schemaType,
                value: value as PortableTextChild,
              })}
            {!renderChild && <DefaultInlineObject value={value} />}
          </span>
        </span>
      )
    }
    throw new Error('Block not found!')
  }

  // If not inline, it's either a block (text) or a block object (non-text)
  // NOTE: text blocks aren't draggable with DraggableBlock (yet?)
  if (element._type === schemaTypes.block.name) {
    className = `pt-block pt-text-block`
    const isListItem = 'listItem' in element
    if (debugRenders) {
      debug(`Render ${element._key} (text block)`)
    }
    const style = ('style' in element && element.style) || 'normal'
    className = `pt-block pt-text-block pt-text-block-style-${style}`
    const blockStyleType = schemaTypes.styles.find(
      (item) => item.value === style,
    )
    if (renderStyle && blockStyleType) {
      renderedBlock = renderStyle({
        block: element as PortableTextTextBlock,
        children,
        focused,
        selected,
        value: style,
        path: blockPath,
        schemaType: blockStyleType,
        editorElementRef: blockRef,
      })
    }
    let level: number | undefined

    if (isListItem) {
      if (typeof element.level === 'number') {
        level = element.level
      }
      className += ` pt-list-item pt-list-item-${element.listItem} pt-list-item-level-${level || 1}`
    }

    if (slateEditor.isListBlock(value) && isListItem && element.listItem) {
      const listType = schemaTypes.lists.find(
        (item) => item.value === element.listItem,
      )
      if (renderListItem && listType) {
        renderedBlock = renderListItem({
          block: value,
          children: renderedBlock,
          focused,
          selected,
          value: element.listItem,
          path: blockPath,
          schemaType: listType,
          level: value.level || 1,
          editorElementRef: blockRef,
        })
      }
    }

    const renderProps: Omit<BlockRenderProps, 'type'> = Object.defineProperty(
      {
        children: renderedBlock,
        editorElementRef: blockRef,
        focused,
        level,
        listItem: isListItem ? element.listItem : undefined,
        path: blockPath,
        selected,
        style,
        schemaType: schemaTypes.block,
        value,
      },
      'type',
      {
        enumerable: false,
        get() {
          console.warn(
            "Property 'type' is deprecated, use 'schemaType' instead.",
          )
          return schemaTypes.block
        },
      },
    )

    const propsOrDefaultRendered = renderBlock
      ? renderBlock(renderProps as BlockRenderProps)
      : children

    return (
      <div
        key={element._key}
        {...attributes}
        className={className}
        spellCheck={spellCheck}
      >
        {dragPositionBlock === 'start' ? <DropIndicator /> : null}
        <div ref={blockRef}>{propsOrDefaultRendered}</div>
        {dragPositionBlock === 'end' ? <DropIndicator /> : null}
      </div>
    )
  }

  const schemaType = schemaTypes.blockObjects.find(
    (_type) => _type.name === element._type,
  )

  if (!schemaType) {
    throw new Error(
      `Could not find schema type for block element of _type ${element._type}`,
    )
  }

  if (debugRenders) {
    debug(`Render ${element._key} (object block)`)
  }

  className = 'pt-block pt-object-block'

  const block = fromSlateValue(
    [element],
    schemaTypes.block.name,
    KEY_TO_VALUE_ELEMENT.get(slateEditor),
  )[0]

  let renderedBlockFromProps: JSX.Element | undefined

  if (renderBlock) {
    const _props: Omit<BlockRenderProps, 'type'> = Object.defineProperty(
      {
        children: <DefaultBlockObject value={value} />,
        editorElementRef: blockRef,
        focused,
        path: blockPath,
        schemaType,
        selected,
        value: block,
      },
      'type',
      {
        enumerable: false,
        get() {
          console.warn(
            "Property 'type' is deprecated, use 'schemaType' instead.",
          )
          return schemaType
        },
      },
    )
    renderedBlockFromProps = renderBlock(_props as BlockRenderProps)
  }

  return (
    <div key={element._key} {...attributes} className={className}>
      {dragPositionBlock === 'start' ? <DropIndicator /> : null}
      {children}
      <div ref={blockRef} contentEditable={false} draggable={!readOnly}>
        {renderedBlockFromProps ? (
          renderedBlockFromProps
        ) : (
          <DefaultBlockObject value={value} />
        )}
      </div>
      {dragPositionBlock === 'end' ? <DropIndicator /> : null}
    </div>
  )
}

Element.displayName = 'Element'
