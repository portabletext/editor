import {
  useEditor,
  type BlockPath,
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

export function BlockObjectPopover() {
  const editor = useEditor()
  const [state, setState] = useState<
    | {
        type: 'idle'
      }
    | {
        type: 'visible'
        object: {
          value: PortableTextObject
          definition: PlaygroundSchemaDefinition['blockObjects'][number]
          at: BlockPath
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

      const focusBlockObject = selectors.getFocusBlockObject(snapshot)

      if (!focusBlockObject) {
        setState({type: 'idle'})
        return
      }

      const definition = playgroundSchemaDefinition.blockObjects.find(
        (definition) => definition.name === focusBlockObject.node._type,
      )

      if (!definition) {
        setState({type: 'idle'})
        return
      }

      const selectedNodes = editor.dom.getBlockNodes(snapshot)
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
          value: focusBlockObject.node,
          definition,
          at: focusBlockObject.path,
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
      placement="right"
      className="flex flex-col gap-2"
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
                  type: 'block.set',
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
              type: 'delete.block',
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
