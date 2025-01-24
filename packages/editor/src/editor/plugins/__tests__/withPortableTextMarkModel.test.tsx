import {render, waitFor} from '@testing-library/react'
import {createRef, type RefObject} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {
  PortableTextEditorTester,
  schemaType,
  schemaTypeWithColorAndLink,
} from '../../__tests__/PortableTextEditorTester'
import type {EditorSelection} from '../../../types/editor'
import {PortableTextEditor} from '../../PortableTextEditor'

describe('plugin:withPortableTextMarksModel', () => {
  describe('normalization', () => {
    it('merges children correctly when toggling marks in various ranges', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: 'a',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'a1',
              _type: 'span',
              marks: [],
              text: '1234',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ]
      const onChange = vi.fn()
      await waitFor(() => {
        render(
          <PortableTextEditorTester
            onChange={onChange}
            ref={editorRef}
            schemaType={schemaType}
            value={initialValue}
          />,
        )
      })
      const editor = editorRef.current!
      expect(editor).toBeDefined()
      await waitFor(() => {
        PortableTextEditor.focus(editor)
        PortableTextEditor.select(editor, {
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 4},
        })
        PortableTextEditor.toggleMark(editor, 'strong')
        expect(PortableTextEditor.getValue(editor)).toEqual([
          {
            _key: 'a',
            _type: 'myTestBlockType',
            children: [
              {
                _key: 'a1',
                _type: 'span',
                marks: ['strong'],
                text: '1234',
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await waitFor(() => {
        if (editorRef.current) {
          PortableTextEditor.select(editorRef.current, {
            focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 1},
            anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 3},
          })
          PortableTextEditor.toggleMark(editorRef.current, 'strong')
          expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
            {
              _key: 'a',
              _type: 'myTestBlockType',
              children: [
                {
                  _key: 'a1',
                  _type: 'span',
                  marks: ['strong'],
                  text: '1',
                },
                {
                  _key: '2',
                  _type: 'span',
                  marks: [],
                  text: '23',
                },
                {
                  _key: '1',
                  _type: 'span',
                  marks: ['strong'],
                  text: '4',
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ])
        }
      })
      await waitFor(() => {
        if (editor) {
          PortableTextEditor.select(editor, {
            focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
            anchor: {path: [{_key: 'a'}, 'children', {_key: '1'}], offset: 1},
          })
          PortableTextEditor.toggleMark(editor, 'strong')
          expect(PortableTextEditor.getValue(editor)).toMatchInlineSnapshot(`
[
  {
    "_key": "a",
    "_type": "myTestBlockType",
    "children": [
      {
        "_key": "a1",
        "_type": "span",
        "marks": [
          "strong",
        ],
        "text": "1234",
      },
    ],
    "markDefs": [],
    "style": "normal",
  },
]
`)
        }
      })
    })

    it('toggles marks on children with annotation marks correctly', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: 'a',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'a1',
              _type: 'span',
              marks: ['abc'],
              text: 'A link',
            },
            {
              _key: 'a2',
              _type: 'span',
              marks: [],
              text: ', not a link',
            },
          ],
          markDefs: [
            {
              _type: 'link',
              _key: 'abc',
              href: 'http://www.link.com',
            },
          ],
          style: 'normal',
        },
      ]
      const onChange = vi.fn()

      render(
        <PortableTextEditorTester
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
          PortableTextEditor.select(editorRef.current, {
            focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
            anchor: {path: [{_key: 'a'}, 'children', {_key: 'a2'}], offset: 12},
          })
          PortableTextEditor.toggleMark(editorRef.current, 'strong')
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
                  marks: ['abc', 'strong'],
                  text: 'A link',
                },
                {
                  _key: 'a2',
                  _type: 'span',
                  marks: ['strong'],
                  text: ', not a link',
                },
              ],
              markDefs: [
                {
                  _type: 'link',
                  _key: 'abc',
                  href: 'http://www.link.com',
                },
              ],
              style: 'normal',
            },
          ])
        }
      })
    })

    it('merges blocks correctly when containing links', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: '5fc57af23597',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'be1c67c6971a',
              _type: 'span',
              marks: [],
              text: 'This is a ',
            },
            {
              _key: '11c8c9f783a8',
              _type: 'span',
              marks: ['fde1fd54b544'],
              text: 'link',
            },
          ],
          markDefs: [
            {
              _key: 'fde1fd54b544',
              _type: 'link',
              url: '1',
            },
          ],
          style: 'normal',
        },
        {
          _key: '7cd53af36712',
          _type: 'myTestBlockType',
          children: [
            {
              _key: '576c748e0cd2',
              _type: 'span',
              marks: [],
              text: 'This is ',
            },
            {
              _key: 'f3d73d3833bf',
              _type: 'span',
              marks: ['7b6d3d5de30c'],
              text: 'another',
            },
          ],
          markDefs: [
            {
              _key: '7b6d3d5de30c',
              _type: 'link',
              url: '2',
            },
          ],
          style: 'normal',
        },
      ]
      const sel: EditorSelection = {
        focus: {
          path: [{_key: '5fc57af23597'}, 'children', {_key: '11c8c9f783a8'}],
          offset: 4,
        },
        anchor: {
          path: [{_key: '7cd53af36712'}, 'children', {_key: '576c748e0cd2'}],
          offset: 0,
        },
      }
      const onChange = vi.fn()
      await waitFor(() => {
        render(
          <PortableTextEditorTester
            onChange={onChange}
            ref={editorRef}
            schemaType={schemaType}
            value={initialValue}
          />,
        )
      })
      const editor = editorRef.current!
      expect(editor).toBeDefined()
      await waitFor(() => {
        PortableTextEditor.select(editor, sel)
        PortableTextEditor.delete(editor, sel)
        expect(PortableTextEditor.getValue(editor)).toMatchInlineSnapshot(`
        [
          {
            "_key": "5fc57af23597",
            "_type": "myTestBlockType",
            "children": [
              {
                "_key": "be1c67c6971a",
                "_type": "span",
                "marks": [],
                "text": "This is a ",
              },
              {
                "_key": "11c8c9f783a8",
                "_type": "span",
                "marks": [
                  "fde1fd54b544",
                ],
                "text": "link",
              },
              {
                "_key": "576c748e0cd2",
                "_type": "span",
                "marks": [],
                "text": "This is ",
              },
              {
                "_key": "f3d73d3833bf",
                "_type": "span",
                "marks": [
                  "7b6d3d5de30c",
                ],
                "text": "another",
              },
            ],
            "markDefs": [
              {
                "_key": "fde1fd54b544",
                "_type": "link",
                "url": "1",
              },
              {
                "_key": "7b6d3d5de30c",
                "_type": "link",
                "url": "2",
              },
            ],
            "style": "normal",
          },
        ]
      `)
      })
    })

    it('resets markDefs when splitting a block in the beginning', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: 'ba',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'sa',
              _type: 'span',
              marks: [],
              text: '1',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'bb',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'sb',
              _type: 'span',
              marks: ['aa'],
              text: '2',
            },
          ],
          markDefs: [
            {
              _key: 'aa',
              _type: 'link',
              href: 'http://www.123.com',
            },
          ],
          style: 'normal',
        },
      ]
      const sel: EditorSelection = {
        focus: {path: [{_key: 'bb'}, 'children', {_key: 'sb'}], offset: 0},
        anchor: {path: [{_key: 'bb'}, 'children', {_key: 'sb'}], offset: 0},
      }
      const onChange = vi.fn()

      render(
        <PortableTextEditorTester
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
          PortableTextEditor.select(editorRef.current, sel)
          PortableTextEditor.insertBreak(editorRef.current)
        }
      })

      await waitFor(() => {
        if (editorRef.current) {
          expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
            {
              _key: 'ba',
              _type: 'myTestBlockType',
              children: [
                {
                  _key: 'sa',
                  _type: 'span',
                  marks: [],
                  text: '1',
                },
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _key: '1',
              _type: 'myTestBlockType',
              children: [
                {
                  _key: '2',
                  _type: 'span',
                  marks: [],
                  text: '',
                },
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _key: 'bb',
              _type: 'myTestBlockType',
              children: [
                {
                  _key: 'sb',
                  _type: 'span',
                  marks: ['aa'],
                  text: '2',
                },
              ],
              markDefs: [
                {
                  _key: 'aa',
                  _type: 'link',
                  href: 'http://www.123.com',
                },
              ],
              style: 'normal',
            },
          ])
        }
      })
    })
  })
  describe('selection', () => {
    it('should emit a new selection object when toggling marks, even though the value is the same', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: 'ba',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'sa',
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
        }
      })

      await waitFor(() => {
        if (editorRef.current) {
          const currentSelectionObject = PortableTextEditor.getSelection(
            editorRef.current,
          )
          PortableTextEditor.toggleMark(editorRef.current, 'strong')
          const nextSelectionObject = PortableTextEditor.getSelection(
            editorRef.current,
          )
          expect(currentSelectionObject).toEqual(nextSelectionObject)
          expect(currentSelectionObject === nextSelectionObject).toBe(false)
          expect(onChange).toHaveBeenCalledWith({
            type: 'selection',
            selection: nextSelectionObject,
          })
        }
      })
    })

    it('should return active marks that cover the whole selection', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: 'a',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'a1',
              _type: 'span',
              marks: ['strong'],
              text: '12',
            },
            {
              _key: '2',
              _type: 'span',
              marks: [],
              text: '34',
            },
          ],
          markDefs: [{_key: 'strong', _type: 'strong'}],
          style: 'normal',
        },
      ]
      const onChange = vi.fn()
      await waitFor(() => {
        render(
          <PortableTextEditorTester
            onChange={onChange}
            ref={editorRef}
            schemaType={schemaType}
            value={initialValue}
          />,
        )
      })
      const editor = editorRef.current!
      expect(editor).toBeDefined()
      await waitFor(() => {
        PortableTextEditor.focus(editor)
        PortableTextEditor.select(editor, {
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          anchor: {path: [{_key: 'a'}, 'children', {_key: '2'}], offset: 2},
        })
        expect(PortableTextEditor.isMarkActive(editor, 'strong')).toBe(false)
        PortableTextEditor.toggleMark(editor, 'strong')
        expect(PortableTextEditor.isMarkActive(editor, 'strong')).toBe(true)
      })
    })

    it('should return active annotation types that cover the whole selection', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: 'a',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'a1',
              _type: 'span',
              marks: ['bab319ad3a9d'],
              text: '12',
            },
            {
              _key: '2',
              _type: 'span',
              marks: [],
              text: '34',
            },
          ],
          markDefs: [
            {
              _key: 'bab319ad3a9d',
              _type: 'link',
              href: 'http://www.123.com',
            },
          ],
          style: 'normal',
        },
      ]
      const onChange = vi.fn()
      await waitFor(() => {
        render(
          <PortableTextEditorTester
            onChange={onChange}
            ref={editorRef}
            schemaType={schemaType}
            value={initialValue}
          />,
        )
      })
      const editor = editorRef.current!
      expect(editor).toBeDefined()
      await waitFor(() => {
        PortableTextEditor.focus(editor)
        PortableTextEditor.select(editor, {
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          anchor: {path: [{_key: 'a'}, 'children', {_key: '2'}], offset: 2},
        })
        expect(PortableTextEditor.isAnnotationActive(editor, 'link')).toBe(
          false,
        )
      })
    })
  })

  describe('removing annotations', () => {
    it('preserves other marks that apply to the spans', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: '5fc57af23597',
          _type: 'myTestBlockType',
          children: [
            {
              _key: 'be1c67c6971a',
              _type: 'span',
              marks: ['fde1fd54b544', '7b6d3d5de30c'],
              text: 'This is a link',
            },
          ],
          markDefs: [
            {
              _key: 'fde1fd54b544',
              _type: 'link',
              url: '1',
            },
            {
              _key: '7b6d3d5de30c',
              _type: 'color',
              color: 'blue',
            },
          ],
          style: 'normal',
        },
      ]
      const onChange = vi.fn()
      await waitFor(() => {
        render(
          <PortableTextEditorTester
            onChange={onChange}
            ref={editorRef}
            schemaType={schemaTypeWithColorAndLink}
            value={initialValue}
          />,
        )
      })

      await waitFor(() => {
        if (editorRef.current) {
          PortableTextEditor.focus(editorRef.current)
          // Selects `a link` from `This is a link`, so the mark should be kept in the first span, color mark in both.
          PortableTextEditor.select(editorRef.current, {
            focus: {
              path: [
                {_key: '5fc57af23597'},
                'children',
                {_key: 'be1c67c6971a'},
              ],
              offset: 14,
            },
            anchor: {
              path: [
                {_key: '5fc57af23597'},
                'children',
                {_key: 'be1c67c6971a'},
              ],
              offset: 8,
            },
          })

          const linkType = editorRef.current.schemaTypes.annotations.find(
            (a) => a.name === 'link',
          )
          if (!linkType) {
            throw new Error('No link type found')
          }
          PortableTextEditor.removeAnnotation(editorRef.current, linkType)
          expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
            {
              _key: '5fc57af23597',
              _type: 'myTestBlockType',
              children: [
                {
                  _key: 'be1c67c6971a',
                  _type: 'span',
                  marks: ['fde1fd54b544', '7b6d3d5de30c'], // It has both marks, the link was only removed from the second span
                  text: 'This is ',
                },
                {
                  _key: '1',
                  _type: 'span',
                  marks: ['7b6d3d5de30c'],
                  text: 'a link',
                },
              ],
              markDefs: [
                {
                  _key: 'fde1fd54b544',
                  _type: 'link',
                  url: '1',
                },
                {
                  _key: '7b6d3d5de30c',
                  _type: 'color',
                  color: 'blue',
                },
              ],
              style: 'normal',
            },
          ])

          // removes the color from both
          PortableTextEditor.select(editorRef.current, {
            focus: {
              path: [{_key: '5fc57af23597'}, 'children', {_key: '1'}],
              offset: 6,
            },
            anchor: {
              path: [
                {_key: '5fc57af23597'},
                'children',
                {_key: 'be1c67c6971a'},
              ],
              offset: 0,
            },
          })
          const colorType = editorRef.current.schemaTypes.annotations.find(
            (a) => a.name === 'color',
          )
          if (!colorType) {
            throw new Error('No color type found')
          }

          PortableTextEditor.removeAnnotation(editorRef.current, colorType)

          expect(PortableTextEditor.getValue(editorRef.current)).toEqual([
            {
              _key: '5fc57af23597',
              _type: 'myTestBlockType',
              children: [
                {
                  _key: 'be1c67c6971a',
                  _type: 'span',
                  marks: ['fde1fd54b544'], // The color was removed from both
                  text: 'This is ',
                },
                {
                  _key: '1',
                  _type: 'span',
                  marks: [], // The color was removed from both
                  text: 'a link',
                },
              ],
              markDefs: [
                {
                  _key: 'fde1fd54b544',
                  _type: 'link',
                  url: '1',
                },
              ],
              style: 'normal',
            },
          ])
        }
      })
    })
  })

  describe('removing nodes', () => {
    it('should not insert a new block if we have more blocks available', async () => {
      const editorRef: RefObject<PortableTextEditor | null> = createRef()
      const initialValue = [
        {
          _key: '5fc57af23597',
          _type: 'someObject',
        },
        {
          _type: 'myTestBlockType',
          _key: 'existingBlock',
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: '2',
              text: '',
              marks: [],
            },
          ],
        },
      ]
      const onChange = vi.fn()
      await waitFor(() => {
        render(
          <PortableTextEditorTester
            onChange={onChange}
            ref={editorRef}
            schemaType={schemaType}
            value={initialValue}
          />,
        )
      })

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

          PortableTextEditor.delete(
            editorRef.current,
            {
              focus: {path: [{_key: '5fc57af23597'}], offset: 0},
              anchor: {path: [{_key: '5fc57af23597'}], offset: 0},
            },
            {mode: 'blocks'},
          )

          const value = PortableTextEditor.getValue(editorRef.current)
          expect(value).toEqual([
            {
              _type: 'myTestBlockType',
              _key: 'existingBlock',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: '2',
                  text: '',
                  marks: [],
                },
              ],
            },
          ])
        }
      })
    })
  })
})
