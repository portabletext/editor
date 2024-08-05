import {describe, expect, jest, test} from '@jest/globals'
import {Schema} from '@sanity/schema'
import {type PortableTextBlock} from '@sanity/types'
import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'

import {type EditorChange, type EditorSelection} from '../../types/editor'
import {PortableTextEditable} from '../Editable'
import {PortableTextEditor} from '../PortableTextEditor'

const schema = Schema.compile({
  types: [
    {name: 'portable-text', type: 'array', of: [{type: 'block'}, {type: 'image'}]},
    {name: 'image', type: 'object'},
  ],
}).get('portable-text')

describe(PortableTextEditor.insertBlock.name, () => {
  test('Scenario: Replacing an empty text block with a custom block', async () => {
    const editorRef: RefObject<PortableTextEditor> = createRef()
    const emptyTextBlock: PortableTextBlock = {
      _key: 'ba',
      _type: 'block',
      children: [
        {
          _type: 'span',
          _key: 'sa',
          text: '',
          marks: [],
        },
      ],
      style: 'normal',
    }
    const imageBlock: PortableTextBlock = {
      _key: 'bb',
      _type: 'image',
    }
    const initialValue: Array<PortableTextBlock> = [emptyTextBlock, imageBlock]
    const onChange: (change: EditorChange) => void = jest.fn()

    render(
      <PortableTextEditor
        ref={editorRef}
        schemaType={schema}
        value={initialValue}
        keyGenerator={() => 'bc'}
        onChange={onChange}
      >
        <PortableTextEditable />
      </PortableTextEditor>,
    )

    // Given an empty text block followed by an image
    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({type: 'value', value: initialValue})
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    // And a selection in the empty text block
    const initialSelection: EditorSelection = {
      anchor: {path: [{_key: 'ba'}, 'children', {_key: 'sa'}], offset: 0},
      focus: {path: [{_key: 'ba'}, 'children', {_key: 'sa'}], offset: 0},
      backward: false,
    }
    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.select(editorRef.current, initialSelection)
      }
    })
    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({type: 'selection', selection: initialSelection})
      }
    })

    // When a new image is inserted
    await waitFor(() => {
      if (editorRef.current) {
        const imageBlockType = editorRef.current.schemaTypes.blockObjects.find(
          (object) => object.name === 'image',
        )!
        PortableTextEditor.insertBlock(editorRef.current, imageBlockType)
      }
    })

    // Then the empty text block is replaced with the new image
    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {_key: 'bc', _type: 'image'},
          {_key: 'bb', _type: 'image'},
        ])
      }
    })
  })
})
