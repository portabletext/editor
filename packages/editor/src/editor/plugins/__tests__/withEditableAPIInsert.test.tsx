import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {
  PortableTextEditorTester,
  schemaType,
} from '../../__tests__/PortableTextEditorTester'
import {createTestKeyGenerator} from '../../../internal-utils/test-key-generator'
import {PortableTextEditor} from '../../PortableTextEditor'

const initialValue = [
  {
    _key: 'a',
    _type: 'myTestBlockType',
    children: [
      {
        _key: 'a1',
        _type: 'span',
        marks: [],
        text: 'Block A',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
]
const initialSelection = {
  focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 7},
  anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 7},
}

const emptyTextBlock = [
  {
    _key: 'emptyBlock',
    _type: 'myTestBlockType',
    children: [
      {
        _key: 'emptySpan',
        _type: 'span',
        marks: [],
        text: '',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
]
const emptyBlockSelection = {
  focus: {
    path: [{_key: 'emptyBlock'}, 'children', {_key: 'emptySpan'}],
    offset: 0,
  },
  anchor: {
    path: [{_key: 'emptyBlock'}, 'children', {_key: 'emptySpan'}],
    offset: 0,
  },
}

describe('plugin:withEditableAPI: .insertChild()', () => {
  it('inserts child nodes correctly', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        keyGenerator={createTestKeyGenerator()}
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
        value={initialValue}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        const inlineType = editorRef.current.schemaTypes.inlineObjects.find(
          (t) => t.name === 'someObject',
        )!
        PortableTextEditor.insertChild(editorRef.current, inlineType, {
          color: 'red',
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'a',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'a1',
                _type: 'span',
                marks: [],
                text: 'Block A',
              },
              {
                _key: 'k2',
                _type: 'someObject',
                color: 'red',
              },
              {
                _key: 'k4',
                _type: 'span',
                marks: [],
                text: '',
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.insertChild(
          editorRef.current,
          editorRef.current.schemaTypes.span,
          {
            text: ' ',
          },
        )
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {
            _key: 'a',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'a1',
                _type: 'span',
                marks: [],
                text: 'Block A',
              },
              {
                _key: 'k2',
                _type: 'someObject',
                color: 'red',
              },
              {
                _key: 'k6',
                _type: 'span',
                marks: [],
                text: ' ',
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])

        expect(PortableTextEditor.getSelection(editorRef.current)).toEqual({
          anchor: {path: [{_key: 'a'}, 'children', {_key: 'k6'}], offset: 1},
          focus: {path: [{_key: 'a'}, 'children', {_key: 'k6'}], offset: 1},
          backward: false,
        })
      }
    })
  })
})

describe('plugin:withEditableAPI: .insertBlock()', () => {
  it('should not add empty blank blocks: empty block', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const value = [
      {
        _key: 'emptyBlock',
        _type: 'myTestBlockType',
        children: [
          {
            _key: 'emptySpan',
            _type: 'span',
            marks: [],
            text: '',
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        ref={editorRef}
        schemaType={schemaType}
        value={emptyTextBlock}
        onChange={onChange}
        keyGenerator={createTestKeyGenerator()}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({type: 'value', value})
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, emptyBlockSelection)
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        const someObject = editorRef.current.schemaTypes.inlineObjects.find(
          (t) => t.name === 'someObject',
        )!

        PortableTextEditor.insertBlock(editorRef.current, someObject, {
          color: 'red',
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {_key: 'k2', _type: 'someObject', color: 'red'},
        ])
      }
    })
  })

  it('should not add empty blank blocks: non-empty block', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        ref={editorRef}
        schemaType={schemaType}
        value={initialValue}
        onChange={onChange}
        keyGenerator={createTestKeyGenerator()}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, initialSelection)
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        const someObject = editorRef.current.schemaTypes.inlineObjects.find(
          (t) => t.name === 'someObject',
        )!

        PortableTextEditor.insertBlock(editorRef.current, someObject, {
          color: 'red',
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          ...initialValue,
          {_key: 'k2', _type: 'someObject', color: 'red'},
        ])
      }
    })
  })

  it('should be inserted before if focus is on start of block', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        onChange={onChange}
        ref={editorRef}
        schemaType={schemaType}
        value={initialValue}
        keyGenerator={createTestKeyGenerator()}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        PortableTextEditor.select(editorRef.current, {
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        const someObject = editorRef.current.schemaTypes.inlineObjects.find(
          (t) => t.name === 'someObject',
        )!
        PortableTextEditor.insertBlock(editorRef.current, someObject, {
          color: 'red',
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          {_key: 'k2', _type: 'someObject', color: 'red'},
          ...initialValue,
        ])
      }
    })
  })

  it('should not add empty blank blocks: non text block', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const value = [
      ...initialValue,
      {_key: 'b', _type: 'someObject', color: 'red'},
    ]
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        ref={editorRef}
        schemaType={schemaType}
        value={value}
        onChange={onChange}
        keyGenerator={createTestKeyGenerator()}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({type: 'value', value})
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        // Focus the `someObject` block
        PortableTextEditor.select(editorRef.current, {
          focus: {path: [{_key: 'b'}], offset: 0},
          anchor: {path: [{_key: 'b'}], offset: 0},
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        const someObject = editorRef.current.schemaTypes.inlineObjects.find(
          (t) => t.name === 'someObject',
        )!
        PortableTextEditor.insertBlock(editorRef.current, someObject, {
          color: 'yellow',
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          ...value,
          {_key: 'k2', _type: 'someObject', color: 'yellow'},
        ])
      }
    })
  })

  it('should not add empty blank blocks: in between blocks', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const value = [
      ...initialValue,
      {_key: 'b', _type: 'someObject', color: 'red'},
    ]
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        ref={editorRef}
        schemaType={schemaType}
        value={value}
        onChange={onChange}
        keyGenerator={createTestKeyGenerator()}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({type: 'value', value})
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.focus(editorRef.current)
        // Focus the `text` block
        PortableTextEditor.select(editorRef.current, initialSelection)
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        const someObject = editorRef.current.schemaTypes.inlineObjects.find(
          (t) => t.name === 'someObject',
        )!
        PortableTextEditor.insertBlock(editorRef.current, someObject, {
          color: 'yellow',
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          value[0],
          {_key: 'k2', _type: 'someObject', color: 'yellow'},
          value[1],
        ])
      }
    })
  })

  it('should not add empty blank blocks: in new empty text block', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const value = [...initialValue, ...emptyTextBlock]
    const onChange = vi.fn()

    render(
      <PortableTextEditorTester
        ref={editorRef}
        schemaType={schemaType}
        value={value}
        onChange={onChange}
        keyGenerator={createTestKeyGenerator()}
      />,
    )

    await waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({type: 'value', value})
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        PortableTextEditor.select(editorRef.current, emptyBlockSelection)
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        const someObject = editorRef.current.schemaTypes.inlineObjects.find(
          (t) => t.name === 'someObject',
        )!
        PortableTextEditor.insertBlock(editorRef.current, someObject, {
          color: 'yellow',
        })
      }
    })

    await waitFor(() => {
      if (editorRef.current) {
        expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
          value[0],
          {_key: 'k2', _type: 'someObject', color: 'yellow'},
        ])
      }
    })
  })
})
