import {expect, test} from 'vitest'
import type {EditorSchema, EditorSelection, EditorSnapshot} from '.'
import {getSelectionText} from './selector.get-selection-text'

test(getSelectionText.name, () => {
  function snapshot(selection: EditorSelection): EditorSnapshot {
    return {
      context: {
        converters: [],
        schema: {} as EditorSchema,
        keyGenerator: () => '',
        activeDecorators: [],
        value: [
          {
            _type: 'block',
            _key: 'e0-k8',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: 'e0-k7',
                text: ':b',
                marks: [],
              },
              {
                text: 'a',
                _type: 'span',
                _key: 'e0-k9',
                marks: ['strong'],
              },
              {
                text: 'r',
                marks: [],
                _type: 'span',
                _key: 'e0-k10',
              },
            ],
          },
        ],
        selection,
      },
    }
  }

  expect(
    getSelectionText(
      snapshot({
        anchor: {
          path: [
            {
              _key: 'e0-k8',
            },
            'children',
            {
              _key: 'e0-k7',
            },
          ],
          offset: 0,
        },
        focus: {
          path: [
            {
              _key: 'e0-k8',
            },
            'children',
            {
              _key: 'e0-k10',
            },
          ],
          offset: 1,
        },
      }),
    ),
  ).toBe(':bar')
})
