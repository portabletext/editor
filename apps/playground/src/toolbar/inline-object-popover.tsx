import {
  useEditor,
  type ChildPath,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {PencilIcon, TrashIcon} from 'lucide-react'
import React, {useEffect, useState, type RefObject} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../components/button'
import {Popover} from '../components/popover'
import {Tooltip} from '../components/tooltip'
import {
  playgroundSchemaDefinition,
  type PlaygroundSchemaDefinition,
} from '../playground-schema-definition'
import {InsertDialog} from './insert-dialog'
import {ObjectForm} from './object-form'

export function InlineObjectPopover() {
  const editor = useEditor()
  const [state, setState] = useState<
    | {
        type: 'idle'
      }
    | {
        type: 'visible'
        object: {
          value: PortableTextObject
          definition: PlaygroundSchemaDefinition['inlineObjects'][number]
          at: ChildPath
        }
        triggerRef: RefObject<Element | null>
      }
  >({type: 'idle'})

  useEffect(() => {
    return editor.on('selection', () => {
      const snapshot = editor.getSnapshot()

      if (!selectors.isSelectionCollapsed(snapshot)) {
        setState({type: 'idle'})
        return
      }

      const focusInlineObject = selectors.getFocusInlineObject(snapshot)

      if (!focusInlineObject) {
        setState({type: 'idle'})
        return
      }

      const definition = playgroundSchemaDefinition.inlineObjects.find(
        (definition) => definition.name === focusInlineObject.node._type,
      )

      if (!definition) {
        setState({type: 'idle'})
        return
      }

      const selectedNodes = editor.dom.getChildNodes(snapshot)
      const firstSelectedNode = selectedNodes.at(0)

      if (!firstSelectedNode || !(firstSelectedNode instanceof Element)) {
        setState({type: 'idle'})
        return
      }

      const triggerRef = React.createRef<Element>()
      triggerRef.current = firstSelectedNode

      setState({
        type: 'visible',
        object: {
          value: focusInlineObject.node,
          definition,
          at: focusInlineObject.path,
        },
        triggerRef,
      })
    }).unsubscribe
  }, [editor])

  if (state.type === 'idle') {
    return null
  }

  return (
    <Popover
      isNonModal
      className="flex gap-2"
      triggerRef={state.triggerRef}
      isOpen={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setState({type: 'idle'})
          editor.send({type: 'focus'})
        }
      }}
    >
      {state.object.definition.fields.length > 0 ? (
        <InsertDialog
          title={state.object.definition.title}
          icon={state.object.definition.icon}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setState({type: 'idle'})
              editor.send({type: 'focus'})
            }
          }}
          trigger={
            <TooltipTrigger>
              <Button aria-label="Edit" variant="secondary" size="sm">
                <PencilIcon className="size-3" />
              </Button>
              <Tooltip>Edit</Tooltip>
            </TooltipTrigger>
          }
        >
          {({close}) => (
            <ObjectForm
              submitLabel="Save"
              fields={state.object.definition.fields}
              defaultValues={state.object.value}
              onSubmit={({values}) => {
                editor.send({
                  type: 'child.set',
                  at: state.object.at,
                  props: values,
                })
                editor.send({type: 'focus'})
                close()
              }}
            />
          )}
        </InsertDialog>
      ) : null}
      <TooltipTrigger>
        <Button
          aria-label="Remove"
          variant="destructive"
          size="sm"
          onPress={() => {
            editor.send({
              type: 'delete.child',
              at: state.object.at,
            })
            editor.send({type: 'focus'})
          }}
        >
          <TrashIcon className="size-3" />
        </Button>
        <Tooltip>Remove</Tooltip>
      </TooltipTrigger>
    </Popover>
  )
}
