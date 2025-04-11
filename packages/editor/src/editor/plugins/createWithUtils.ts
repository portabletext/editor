import {toSlateValue} from '../../internal-utils/values'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'

interface Options {
  editorActor: EditorActor
}

/**
 * This plugin makes various util commands available in the editor
 *
 */
export function createWithUtils({editorActor}: Options) {
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
            _type: editorActor.getSnapshot().context.schema.block.name,
            _key: editorActor.getSnapshot().context.keyGenerator(),
            style:
              editorActor.getSnapshot().context.schema.styles[0].name ||
              'normal',
            ...(options.listItem ? {listItem: options.listItem} : {}),
            ...(options.level ? {level: options.level} : {}),
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: editorActor.getSnapshot().context.keyGenerator(),
                text: '',
                marks: options.decorators.filter((decorator) =>
                  editorActor
                    .getSnapshot()
                    .context.schema.decorators.find(
                      ({name}) => name === decorator,
                    ),
                ),
              },
            ],
          },
        ],
        {schemaTypes: editorActor.getSnapshot().context.schema},
      )[0]
      return block
    }
    return editor
  }
}
