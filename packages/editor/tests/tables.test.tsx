import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('tables', () => {
  describe('one row, three columns', () => {
    const schemaDefinition = defineSchema({
      blocks: [
        {
          name: 'table',
          children: [{name: 'row'}],
        },
        {
          name: 'row',
          children: [{name: 'cell'}],
        },
        {
          name: 'cell',
          children: [{name: 'span'}],
        },
      ],
    })
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cell0Key = keyGenerator()
    const cell1Key = keyGenerator()
    const cell2Key = keyGenerator()
    const span0Key = keyGenerator()
    const span1Key = keyGenerator()
    const span2Key = keyGenerator()
    const initialValue = [
      {
        _key: tableKey,
        _type: 'table',
        children: [
          {
            _key: rowKey,
            _type: 'row',
            children: [
              {
                _key: cell0Key,
                _type: 'cell',
                children: [
                  {_key: span0Key, _type: 'span', text: 'foo', marks: []},
                ],
              },
              {
                _key: cell1Key,
                _type: 'cell',
                children: [
                  {_key: span1Key, _type: 'span', text: 'bar', marks: []},
                ],
              },
              {
                _key: cell2Key,
                _type: 'cell',
                children: [
                  {_key: span2Key, _type: 'span', text: 'baz', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ]

    test('rendering', async () => {
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(initialValue)
      })
    })

    test('writing in the first column', async () => {
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue,
      })

      await userEvent.click(locator)

      const afterBazSelection = {
        anchor: {
          path: [
            {_key: tableKey},
            'children',
            {_key: rowKey},
            'children',
            {_key: cell2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: tableKey},
            'children',
            {_key: rowKey},
            'children',
            {_key: cell2Key},
            'children',
            {_key: span2Key},
          ],
          offset: 3,
        },
        backward: false,
      }

      editor.send({
        type: 'select',
        at: afterBazSelection,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual(
          afterBazSelection,
        )
      })

      await userEvent.type(locator, 'hello')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: tableKey,
            _type: 'table',
            children: [
              {
                _key: rowKey,
                _type: 'row',
                children: [
                  {
                    _key: cell0Key,
                    _type: 'cell',
                    children: [
                      {_key: span0Key, _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: cell1Key,
                    _type: 'cell',
                    children: [
                      {_key: span1Key, _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: cell2Key,
                    _type: 'cell',
                    children: [
                      {
                        _key: span2Key,
                        _type: 'span',
                        text: 'bazhello',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ])
      })
    })
  })
})
