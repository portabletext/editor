import {useEditor} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getFragment} from '@portabletext/editor/selectors'
import {portableTextToSlack, slackToPortableText} from '@portabletext/slack'
import {useEffect} from 'react'

const pasteFromSlack = defineBehavior({
  on: 'deserialize',
  guard: ({snapshot, event}) => {
    const dataTransfer = event.originEvent.originEvent.dataTransfer
    const texty = dataTransfer.getData('slack/texty')

    if (!texty || dataTransfer.getData('application/x-portable-text')) {
      return false
    }

    const blocks = slackToPortableText(texty, {
      schema: snapshot.context.schema,
      keyGenerator: snapshot.context.keyGenerator,
    })

    return blocks.length > 0 ? {blocks} : false
  },
  actions: [
    ({event}, {blocks}) => [
      raise({
        type: 'deserialization.success',
        mimeType: 'slack/texty',
        data: blocks,
        originEvent: event.originEvent,
      }),
    ],
  ],
})

const copyForSlack = defineBehavior({
  on: 'serialize.data',
  guard: ({snapshot, event}) => {
    if (event.mimeType !== 'text/plain') {
      return false
    }

    const fragmentSnapshot =
      event.originEvent.type === 'drag.dragstart'
        ? {
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: event.originEvent.position.selection,
            },
          }
        : snapshot
    const blocks = getFragment(fragmentSnapshot).map((entry) => entry.node)

    if (blocks.length === 0) {
      return false
    }

    return portableTextToSlack(blocks, {schema: snapshot.context.schema})
  },
  actions: [
    ({event}, {texty, text}) => [
      raise({
        type: 'serialization.success',
        mimeType: 'slack/texty',
        data: texty,
        originEvent: event.originEvent,
      }),
      raise({
        type: 'serialization.success',
        mimeType: 'text/plain',
        data: text,
        originEvent: event.originEvent,
      }),
    ],
  ],
})

export function SlackClipboardPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const unregisterPaste = editor.registerBehavior({behavior: pasteFromSlack})
    const unregisterCopy = editor.registerBehavior({behavior: copyForSlack})

    return () => {
      unregisterPaste()
      unregisterCopy()
    }
  }, [editor])

  return null
}
