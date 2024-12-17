import {
  EditorEventListener,
  EditorProvider,
  PortableTextEditable,
  type PortableTextBlock,
  type SchemaDefinition,
} from '@portabletext/editor'
import {coreBehaviors, defineBehavior} from '@portabletext/editor/behaviors'
import {
  getFocusSpan,
  getFocusTextBlock,
  isSelectionCollapsed,
} from '@portabletext/editor/selectors'
import {PortableText} from '@portabletext/react'
import {useState} from 'react'
import {Button} from '../ui/button'
import {defaultSchema} from './defaultSchema'
import {Toolbar} from './toolbar'

type PortableTextEditorProps = {
  customSchema?: SchemaDefinition
}

export function PortableTextEditor({customSchema}: PortableTextEditorProps) {
  const [value, setValue] = useState<Array<PortableTextBlock> | undefined>(
    undefined,
  )
  const [showJsonPreview, setShowJsonPreview] = useState(true)
  const [showPortableTextPreview, setShowPortableTextPreview] = useState(true)
  const schemaDefinition = customSchema || defaultSchema

  return (
    <div className="not-content">
      <EditorProvider
        initialConfig={{
          schemaDefinition,
          behaviors: [
            ...coreBehaviors,
            defineBehavior({
              on: 'paste',
              guard: ({context, event}) => {
                // Check if the inserted text is a known emoji shortcode
                const text = event.data.getData('text/plain')
                const isEmojiShortcode = text === ':)'

                // Only proceed if it's an emoji shortcode and the selection is collapsed
                if (!isEmojiShortcode || !isSelectionCollapsed({context})) {
                  return false
                }

                const focusTextBlock = getFocusTextBlock({context})
                const focusSpan = getFocusSpan({context})

                if (!focusTextBlock || !focusSpan) {
                  return false
                }

                return {focusTextBlock, focusSpan}
              },
              actions: [
                (_, {focusTextBlock}) => [
                  {
                    type: 'insert.text',
                    at: focusTextBlock.path,
                    text: '😊', // Replace with actual emoji
                  },
                ],
              ],
            }),
          ],
        }}
      >
        <EditorEventListener
          on={(event) => {
            if (event.type === 'mutation') {
              setValue(event.snapshot)
            }
          }}
        />
        <div className="w-full max-w-4xl mx-auto space-y-4 mb-4">
          <Toolbar />
          <PortableTextEditable className="min-h-[200px] border border-gray-200 rounded-md p-2" />
        </div>
      </EditorProvider>
      {value && (
        <div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowJsonPreview(!showJsonPreview)}
            >
              Toggle JSON Preview
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                setShowPortableTextPreview(!showPortableTextPreview)
              }
            >
              Toggle Portable Text Preview
            </Button>
          </div>
          {showJsonPreview && (
            <div className="not-content text-sm p-2">
              <pre>
                <code>{JSON.stringify(value, null, 2)}</code>
              </pre>
            </div>
          )}
          {showPortableTextPreview && (
            <div className="text-sm p-2">
              <PortableText value={value} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
