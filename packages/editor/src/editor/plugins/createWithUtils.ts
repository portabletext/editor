import {toSlateValue} from '../../internal-utils/values'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import type {EditorActor} from '../editor-machine'

interface Options {
  editorActor: EditorActor
  schemaTypes: PortableTextMemberSchemaTypes
}

/**
 * This plugin makes various util commands available in the editor
 *
 */
export function createWithUtils({editorActor, schemaTypes}: Options) {
  return function withUtils(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    editor.pteCreateTextBlock = (options: {
      decorators: Array<string>
      listItem?: string
      level?: number
    }) => {
      const block = toSlateValue(
        [
          {
            _type: schemaTypes.block.name,
            _key: editorActor.getSnapshot().context.keyGenerator(),
            style: schemaTypes.styles[0].value || 'normal',
            ...(options.listItem ? {listItem: options.listItem} : {}),
            ...(options.level ? {level: options.level} : {}),
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: editorActor.getSnapshot().context.keyGenerator(),
                text: '',
                marks: options.decorators.filter((decorator) =>
                  schemaTypes.decorators.find(({value}) => value === decorator),
                ),
              },
            ],
          },
        ],
        {schemaTypes},
      )[0]
      return block
    }
    return editor
  }
}
