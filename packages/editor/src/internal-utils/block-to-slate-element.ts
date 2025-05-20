import {Element} from 'slate'
import {EditorContext} from '../editor/editor-snapshot'
import {isTypedObject} from './asserters'
import {isSpan, isTextBlock, parseBlock} from './parse-blocks'

export function blockToSlateElement({
  context,
  block,
}: {
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>
  block: unknown
}): Element | undefined {
  const parsedBlock = parseBlock({
    context,
    block,
    options: {
      addDefaultFields: false,
      refreshKeys: false,
      validateFields: false,
    },
  })

  if (isTextBlock(context, parsedBlock)) {
    return {
      ...parsedBlock,
      children: parsedBlock.children.map((child) => {
        if (isSpan(context, child)) {
          return child
        }

        const {_key, _type, ...rest} = child

        return {
          _key,
          _type,
          value: rest,
          __inline: true,
          children: [
            {
              _key: 'void-child',
              _type: 'span',
              text: '',
              marks: [],
            },
          ],
        }
      }),
    }
  } else if (isTypedObject(parsedBlock)) {
    const {_key, _type, ...rest} = parsedBlock

    return {
      _key: typeof _key === 'string' ? _key : context.keyGenerator(),
      _type,
      value: rest,
      children: [
        {
          _key: 'void-child',
          _type: 'span',
          text: '',
          marks: [],
        },
      ],
    }
  }
}
