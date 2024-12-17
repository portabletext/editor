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
import {applyAll} from '@portabletext/patches'
import {PortableText} from '@portabletext/react'
import {useState} from 'react'
import {Button} from '../ui/button'
import {defaultSchema} from './defaultSchema'
import './editor.css'
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
    <div className="not-content max-w-4xl">
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
            if (event.type === 'patch') {
              setValue((prevValue) => applyAll(prevValue, [event.patch]))
            }
            if (event.type === 'mutation') {
              setValue(event.snapshot)
            }
          }}
        />
        <div className="w-full max-w-4xl mx-auto space-y-4 mb-4">
          <Toolbar />
          <PortableTextEditable
            className="min-h-[200px] border border-gray-200 rounded-md p-2"
            renderBlock={(props) => props.children}
            renderChild={(props) => props.children}
            renderListItem={(props) => props.children}
            renderStyle={(props) => {
              if (props.value === 'h1') {
                return (
                  <h1 className="mb-1 font-bold text-3xl">{props.children}</h1>
                )
              }
              if (props.value === 'h2') {
                return (
                  <h2 className="mb-1 font-bold text-2xl">{props.children}</h2>
                )
              }
              if (props.value === 'h3') {
                return (
                  <h3 className="mb-1 font-bold text-xl">{props.children}</h3>
                )
              }
              if (props.value === 'blockquote') {
                return (
                  <blockquote className="mb-1 pl-2 py-1 border-gray-200 border-l-4">
                    {props.children}
                  </blockquote>
                )
              }
              return <p className="mb-1">{props.children}</p>
            }}
            renderDecorator={(props) => {
              if (props.value === 'strong') {
                return <strong>{props.children}</strong>
              }
              if (props.value === 'em') {
                return <em>{props.children}</em>
              }
              if (props.value === 'underline') {
                return <span className="underline">{props.children}</span>
              }
              return props.children
            }}
            renderAnnotation={(props) => {
              if (props.schemaType.name === 'link') {
                return (
                  <span className="text-blue-800 underline">
                    {props.children}
                  </span>
                )
              }
              return props.children
            }}
            renderPlaceholder={() => (
              <span className="text-gray-400 px-2">Type something</span>
            )}
          />
        </div>
      </EditorProvider>
      {value && (
        <div>
          <div className="flex gap-2">
            <Button
              variant={showJsonPreview ? 'default' : 'ghost'}
              onClick={() => setShowJsonPreview(!showJsonPreview)}
            >
              Toggle JSON Preview
            </Button>
            <Button
              variant={showPortableTextPreview ? 'default' : 'ghost'}
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
