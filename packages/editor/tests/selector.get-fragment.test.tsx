import {defineSchema} from '@portabletext/schema'
import {expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins'
import {getFragment} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'

const initialValue = [
  {
    _key: 'a',
    _type: 'block',
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
  {
    _key: 'b',
    _type: 'block',
    children: [
      {
        _key: 'b1',
        _type: 'span',
        marks: [],
        text: 'Block B ',
      },
      {
        _key: 'b2',
        _type: 'someObject',
      },
      {
        _key: 'b3',
        _type: 'span',
        marks: [],
        text: ' contains a inline object',
      },
    ],
    markDefs: [],
    style: 'normal',
  },
]

test('Scenario: selecting across multiple blocks returns the sliced fragment', async () => {
  const onChange = vi.fn()

  const {editor} = await createTestEditor({
    children: <EventListenerPlugin on={onChange} />,
    initialValue,
    schemaDefinition: defineSchema({
      inlineObjects: [
        {name: 'someObject', fields: [{name: 'color', type: 'string'}]},
      ],
    }),
  })

  const initialSelection = {
    anchor: {path: [{_key: 'a'}, 'children', {_key: 'a1'}], offset: 6},
    focus: {path: [{_key: 'b'}, 'children', {_key: 'b3'}], offset: 9},
  }

  await vi.waitFor(() => {
    expect(onChange).toHaveBeenCalledWith({
      type: 'value changed',
      value: initialValue,
    })
    expect(onChange).toHaveBeenCalledWith({type: 'ready'})
  })

  editor.send({type: 'focus'})
  editor.send({type: 'select', at: initialSelection})

  await vi.waitFor(() => {
    expect(getFragment(editor.getSnapshot())).toEqual([
      {
        node: {
          _key: 'a',
          _type: 'block',
          children: [
            {
              _key: 'a1',
              _type: 'span',
              marks: [],
              text: 'A',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        path: [{_key: 'a'}],
      },
      {
        node: {
          _key: 'b',
          _type: 'block',
          children: [
            {
              _key: 'b1',
              _type: 'span',
              marks: [],
              text: 'Block B ',
            },
            {
              _key: 'b2',
              _type: 'someObject',
            },
            {
              _key: 'b3',
              _type: 'span',
              marks: [],
              text: ' contains',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        path: [{_key: 'b'}],
      },
    ])
  })
})
