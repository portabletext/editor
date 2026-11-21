import {createTestKeyGenerator} from '@portabletext/test'
import type {Node} from '../src/engine/interfaces/node'

export function createEveryFieldFixture() {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 14}, () => keyGenerator())
  const first = {
    _type: 'wrapper',
    details: {
      body: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'foo',
              marks: [],
              metadata: {
                label: 'bar',
              },
              extras: [
                {
                  _type: 'extra',
                },
                {
                  _key: '',
                  _type: 'empty',
                },
                {
                  _key: keys[0]!,
                  _type: 'duplicate',
                },
                {
                  _key: keys[0]!,
                  _type: 'duplicate',
                },
                {
                  _type: 'missing',
                },
                null,
                'foo',
                42,
              ],
            },
            {
              _key: '',
              _type: 'empty',
            },
            {
              _key: keys[1]!,
              _type: 'duplicate',
            },
            {
              _key: keys[1]!,
              _type: 'duplicate',
            },
            {
              _type: 'missing',
            },
            null,
            'foo',
            42,
          ],
          markDefs: [
            {
              _key: keys[2]!,
              _type: 'link',
              href: 'foo',
            },
            {
              _key: '',
              _type: 'empty',
            },
            {
              _key: keys[3]!,
              _type: 'duplicate',
            },
            {
              _key: keys[3]!,
              _type: 'duplicate',
            },
            {
              _type: 'missing',
            },
            null,
            'foo',
            42,
          ],
          side: {
            label: 'baz',
          },
        },
        {
          _key: '',
          _type: 'empty',
        },
        {
          _key: keys[4]!,
          _type: 'duplicate',
        },
        {
          _key: keys[4]!,
          _type: 'duplicate',
        },
        {
          _type: 'missing',
        },
        null,
        'foo',
        42,
      ],
      nil: null,
      label: 'foo',
    },
    zeta: [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'bar',
            marks: [],
          },
          {
            _key: '',
            _type: 'empty',
          },
          {
            _key: keys[5]!,
            _type: 'duplicate',
          },
          {
            _key: keys[5]!,
            _type: 'duplicate',
          },
          {
            _type: 'missing',
          },
          null,
          'foo',
          42,
        ],
        markDefs: [
          {
            _key: keys[6]!,
            _type: 'link',
          },
          {
            _key: '',
            _type: 'empty',
          },
          {
            _key: keys[7]!,
            _type: 'duplicate',
          },
          {
            _key: keys[7]!,
            _type: 'duplicate',
          },
          {
            _type: 'missing',
          },
          null,
          'foo',
          42,
        ],
      },
      {
        _key: '',
        _type: 'empty',
      },
      {
        _key: keys[8]!,
        _type: 'duplicate',
      },
      {
        _key: keys[8]!,
        _type: 'duplicate',
      },
      {
        _type: 'missing',
      },
      null,
      'foo',
      42,
    ],
    alpha: [
      {
        _type: 'object',
        nil: null,
        label: 'baz',
      },
      {
        _key: '',
        _type: 'empty',
      },
      {
        _key: keys[9]!,
        _type: 'duplicate',
      },
      {
        _key: keys[9]!,
        _type: 'duplicate',
      },
      {
        _type: 'missing',
      },
      null,
      'foo',
      42,
    ],
    matrix: [
      [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'baz',
              marks: [],
            },
            {
              _key: '',
              _type: 'empty',
            },
            {
              _key: keys[10]!,
              _type: 'duplicate',
            },
            {
              _key: keys[10]!,
              _type: 'duplicate',
            },
            {
              _type: 'missing',
            },
            null,
            'foo',
            42,
          ],
          markDefs: [],
        },
        {
          _key: '',
          _type: 'empty',
        },
        {
          _key: keys[11]!,
          _type: 'duplicate',
        },
        {
          _key: keys[11]!,
          _type: 'duplicate',
        },
        {
          _type: 'missing',
        },
        null,
        'foo',
        42,
      ],
      {
        _key: '',
        _type: 'empty',
      },
      {
        _key: keys[12]!,
        _type: 'duplicate',
      },
      {
        _key: keys[12]!,
        _type: 'duplicate',
      },
      {
        _type: 'missing',
      },
      null,
      'foo',
      42,
    ],
    nil: null,
    label: 'foo',
  }
  return [
    first,
    ...[
      {
        _key: '',
        _type: 'empty',
      },
      {
        _key: keys[13]!,
        _type: 'duplicate',
      },
      {
        _key: keys[13]!,
        _type: 'duplicate',
      },
      {
        _type: 'missing',
      },
      null,
      'foo',
      42,
    ],
  ] as unknown as [typeof first, ...Node[]]
}
