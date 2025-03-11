import {insertBlockActionImplementation} from './behavior.action.insert.block'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertTextBlockActionImplementation: BehaviorActionImplementation<
  'insert.text block'
> = ({context, action}) => {
  insertBlockActionImplementation({
    context,
    action: {
      type: 'insert.block',
      block: {
        _key: context.keyGenerator(),
        _type: context.schema.block.name,
        children: action.textBlock?.children?.map((child) => ({
          ...child,
          _key: context.keyGenerator(),
        })) ?? [
          {
            _type: context.schema.span.name,
            _key: context.keyGenerator(),
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: context.schema.styles[0].value ?? 'normal',
      },
      editor: action.editor,
      placement: action.placement,
      select: 'start',
    },
  })
}
