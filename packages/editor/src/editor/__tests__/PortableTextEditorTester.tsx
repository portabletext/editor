import {forwardRef, useMemo, type ForwardedRef} from 'react'
import {vi} from 'vitest'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type PortableTextEditableProps,
  type PortableTextEditor,
  type PortableTextEditorProps,
  type SchemaDefinition,
} from '../../index'
import {InternalChange$Plugin} from '../../plugins/plugin.internal.change-ref'
import {InternalPortableTextEditorRefPlugin} from '../../plugins/plugin.internal.portable-text-editor-ref'

export const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {name: 'custom image', fields: [{name: 'src', type: 'string'}]},
  ],
  inlineObjects: [
    {name: 'someObject', fields: [{name: 'color', type: 'string'}]},
  ],
})

export const PortableTextEditorTester = forwardRef(
  function PortableTextEditorTester(
    props: {
      onChange?: PortableTextEditorProps['onChange']
      rangeDecorations?: PortableTextEditableProps['rangeDecorations']
      renderPlaceholder?: PortableTextEditableProps['renderPlaceholder']
      schemaDefinition?: SchemaDefinition
      selection?: PortableTextEditableProps['selection']
      value?: PortableTextEditorProps['value']
      keyGenerator: PortableTextEditorProps['keyGenerator']
    },
    ref: ForwardedRef<PortableTextEditor>,
  ) {
    const onChange = useMemo(() => props.onChange || vi.fn(), [props.onChange])
    return (
      <EditorProvider
        initialConfig={{
          schemaDefinition: props.schemaDefinition ?? schemaDefinition,
          keyGenerator: props.keyGenerator,
          initialValue: props.value,
        }}
      >
        <InternalChange$Plugin onChange={onChange} />
        <InternalPortableTextEditorRefPlugin ref={ref} />
        <PortableTextEditable
          selection={props.selection || undefined}
          rangeDecorations={props.rangeDecorations}
          renderPlaceholder={props.renderPlaceholder}
          aria-describedby="desc_foo"
        />
      </EditorProvider>
    )
  },
)
