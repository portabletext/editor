import type {OperationImplementation} from './operation.types'

export const removeTextOperationImplementation: OperationImplementation<
  'remove.text'
> = ({operation}) => {
  if (operation.text.length === 0) {
    return
  }

  operation.editor.apply({
    type: 'remove.text',
    path: operation.at,
    offset: operation.offset,
    text: operation.text,
  })
}
