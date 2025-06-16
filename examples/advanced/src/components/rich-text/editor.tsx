import {
  EditorProvider,
  PortableTextEditable,
  type EditorEmittedEvent,
  type PortableTextBlock,
} from '@portabletext/editor'
import {EventListenerPlugin} from '@portabletext/editor/plugins'
import {renderChild, renderDecorator, renderStyle} from './renderers'
import {schemaDefinition} from './schema'
import {Toolbar} from './toolbar'
import './editor.css'
import {cn} from '@/lib/utils'

interface RichTextEditorProps {
  value?: Array<PortableTextBlock>
  onChange?: (val: Array<PortableTextBlock>) => void
  className?: string
}

export function RichTextEditor({
  onChange,
  value,
  className,
}: RichTextEditorProps) {
  const handleEditorEvent = (event: EditorEmittedEvent) => {
    if (event.type === 'mutation') {
      if (onChange) {
        onChange(event.value || [])
      }
    }
  }

  return (
    <EditorProvider
      initialConfig={{
        schemaDefinition,
        initialValue: value,
      }}
    >
      <EventListenerPlugin on={handleEditorEvent} />
      <Toolbar />
      <PortableTextEditable
        className={cn(
          'portable-text min-h-32 rounded-lg border border-gray-300 bg-gray-50 p-2.5',
          '  text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500',
          className,
        )}
        renderDecorator={renderDecorator}
        renderStyle={renderStyle}
        renderChild={renderChild}
      />
    </EditorProvider>
  )
}
