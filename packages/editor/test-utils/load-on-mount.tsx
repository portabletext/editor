import type {PortableTextBlock} from '@portabletext/schema'
import {useEffect} from 'react'
import type {EditorEmittedEvent} from '../src'
import {useEditor} from '../src/editor/use-editor'

export type LoadRecord =
  | {
      type: 'ready'
      value: Array<PortableTextBlock>
      status: unknown
    }
  | {type: 'event'; event: EditorEmittedEvent}

export function LoadOnMount(props: {
  loads: Array<Array<PortableTextBlock> | undefined>
  records: Array<LoadRecord>
}) {
  const editor = useEditor()

  useEffect(() => {
    const subscription = editor.on('*', (event) => {
      if (event.type === 'ready') {
        props.records.push({
          type: 'ready',
          value: editor.getSnapshot().context.value,
          status: editor.getSnapshot().status,
        })
        return
      }
      if (event.type === 'operation') {
        return
      }
      props.records.push({type: 'event', event})
    })
    for (const value of props.loads) {
      editor.send({type: 'load', value})
    }
    return () => subscription.unsubscribe()
  }, [editor, props.loads, props.records])

  return null
}
