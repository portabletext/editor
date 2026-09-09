import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins'
import {isActiveAnnotation, isActiveDecorator} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'
import type {EditorSelection} from '../src/types/editor'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
})

describe('mark model', () => {
  describe('normalization', () => {
    test('Scenario: toggling a decorator across a span that also carries an annotation mark keeps the annotation mark', async () => {
      const initialValue = [
        {
          _key: 'a',
          _type: 'block',
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

      const {editor} = await createTestEditor({
        schemaDefinition,
        children: <EventListenerPlugin on={onChange} />,
        initialValue,
      })

      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value changed',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      })

      editor.send({type: 'focus'})
      editor.send({
        type: 'select',
        at: {
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          anchor: {path: [{_key: 'a'}, 'children', {_key: 'a2'}], offset: 12},
        },
      })
      editor.send({type: 'decorator.toggle', decorator: 'strong'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'a',
            _type: 'block',
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
      })
    })

    test('Scenario: deleting a selection spanning two blocks with links merges the blocks and keeps both links', async () => {
      const initialValue = [
        {
          _key: '5fc57af23597',
          _type: 'block',
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
          _type: 'block',
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

      const {editor} = await createTestEditor({
        schemaDefinition,
        children: <EventListenerPlugin on={onChange} />,
        initialValue,
      })

      editor.send({type: 'select', at: sel})
      editor.send({type: 'delete', at: sel})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: '5fc57af23597',
            _type: 'block',
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
                _key: 'fde1fd54b544',
                _type: 'link',
                url: '1',
              },
              {
                _key: '7b6d3d5de30c',
                _type: 'link',
                url: '2',
              },
            ],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: splitting a block at its start resets markDefs on the new leading empty block', async () => {
      const initialValue = [
        {
          _key: 'ba',
          _type: 'block',
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
          _type: 'block',
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

      const {editor} = await createTestEditor({
        schemaDefinition,
        children: <EventListenerPlugin on={onChange} />,
        initialValue,
      })

      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value changed',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      })

      editor.send({type: 'select', at: sel})
      editor.send({type: 'insert.break'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'ba',
            _type: 'block',
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
            _key: 'k2',
            _type: 'block',
            children: [
              {
                _key: 'k3',
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
            _type: 'block',
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
      })
    })
  })
  describe('selection', () => {
    test('Scenario: toggling a decorator emits a new selection object even though the selection value is unchanged', async () => {
      const initialValue = [
        {
          _key: 'ba',
          _type: 'block',
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

      const {editor} = await createTestEditor({
        schemaDefinition,
        children: <EventListenerPlugin on={onChange} />,
        initialValue,
      })

      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value changed',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      })

      editor.send({type: 'focus'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).not.toBeNull()
      })

      const currentSelectionObject = editor.getSnapshot().context.selection

      editor.send({type: 'decorator.toggle', decorator: 'strong'})

      await vi.waitFor(() => {
        const nextSelectionObject = editor.getSnapshot().context.selection
        expect(currentSelectionObject).toEqual(nextSelectionObject)
        expect(currentSelectionObject === nextSelectionObject).toBe(false)
        expect(onChange).toHaveBeenCalledWith({
          type: 'selection',
          selection: nextSelectionObject,
        })
      })
    })

    test('Scenario: a decorator is active only once it covers the whole selection', async () => {
      const initialValue = [
        {
          _key: 'a',
          _type: 'block',
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

      const {editor} = await createTestEditor({
        schemaDefinition,
        children: <EventListenerPlugin on={onChange} />,
        initialValue,
      })

      editor.send({type: 'focus'})
      editor.send({
        type: 'select',
        at: {
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          anchor: {path: [{_key: 'a'}, 'children', {_key: '2'}], offset: 2},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: 'a'}, 'children', {_key: '2'}], offset: 2},
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          backward: true,
        })
      })

      expect(isActiveDecorator('strong')(editor.getSnapshot())).toBe(false)

      editor.send({type: 'decorator.toggle', decorator: 'strong'})

      await vi.waitFor(() => {
        expect(isActiveDecorator('strong')(editor.getSnapshot())).toBe(true)
      })
    })

    test('Scenario: an annotation that does not cover the whole selection is not active', async () => {
      const initialValue = [
        {
          _key: 'a',
          _type: 'block',
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

      const {editor} = await createTestEditor({
        schemaDefinition,
        children: <EventListenerPlugin on={onChange} />,
        initialValue,
      })

      editor.send({type: 'focus'})
      editor.send({
        type: 'select',
        at: {
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          anchor: {path: [{_key: 'a'}, 'children', {_key: '2'}], offset: 2},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: [{_key: 'a'}, 'children', {_key: '2'}], offset: 2},
          focus: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 0},
          backward: true,
        })
      })

      expect(isActiveAnnotation('link')(editor.getSnapshot())).toBe(false)
    })
  })

  describe('removing nodes', () => {
    test('Scenario: deleting the only block object leaves the remaining text block as-is without inserting a placeholder', async () => {
      const initialValue = [
        {
          _key: '5fc57af23597',
          _type: 'custom image',
        },
        {
          _type: 'block',
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

      const {editor} = await createTestEditor({
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'custom image'}],
        }),
        children: <EventListenerPlugin on={onChange} />,
        initialValue,
      })

      await vi.waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value changed',
          value: initialValue,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      })

      editor.send({type: 'focus'})
      editor.send({
        type: 'delete',
        at: {
          focus: {path: [{_key: '5fc57af23597'}], offset: 0},
          anchor: {path: [{_key: '5fc57af23597'}], offset: 0},
        },
        unit: 'block',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
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
      })
    })
  })
})
