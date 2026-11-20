import {compileSchema, defineSchema, isTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {defineContainer} from '../renderers/renderer.types'
import {resolveTestbedContainers} from '../traversal/node-traversal-testbed'
import {namesMissingTarget} from './names-missing-target'

describe(namesMissingTarget.name, () => {
  test('gone span', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k9'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k9'}], offset: 0},
      }),
    ).toEqual(true)
  })
  test('gone text block at root', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k9'}, 'children', {_key: 'k10'}], offset: 0},
        focus: {path: [{_key: 'k9'}, 'children', {_key: 'k10'}], offset: 0},
      }),
    ).toEqual(true)
  })
  test('gone text block inside a container', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k10'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k9'},
            'children',
            {_key: 'k10'},
          ],
          offset: 0,
        },
      }),
    ).toEqual(true)
  })
  test('missing root block-level path', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k9'}], offset: 0},
        focus: {path: [{_key: 'k9'}], offset: 0},
      }),
    ).toEqual(true)
  })
  test('missing nested block-level path', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k2'}, 'content', {_key: 'k9'}], offset: 0},
        focus: {path: [{_key: 'k2'}, 'content', {_key: 'k9'}], offset: 0},
      }),
    ).toEqual(true)
  })
  test('present span', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      }),
    ).toEqual(false)
  })
  test('link path names no position', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k0'}, 'markDefs', {_key: 'k9'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'markDefs', {_key: 'k9'}], offset: 0},
      }),
    ).toEqual(true)
  })
  test('empty path', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [], offset: 0},
        focus: {path: [], offset: 0},
      }),
    ).toEqual(false)
  })
  test('missing empty key', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: ''}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: ''}], offset: 0},
      }),
    ).toEqual(true)
  })
  test('string child item', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    const block = snapshot.context.value[0]
    if (!isTextBlock(snapshot.context, block)) {
      throw new Error('Expected a text block')
    }
    Reflect.set(block.children, 0, 'foo')
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      }),
    ).toEqual(true)
  })
  test('field-ending path', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [{_key: 'k2'}, 'content'], offset: 0},
        focus: {path: [{_key: 'k2'}, 'content'], offset: 0},
      }),
    ).toEqual(false)
  })

  test('numeric last segment', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {path: [5], offset: 0},
        focus: {path: [5], offset: 0},
      }),
    ).toEqual(false)
  })

  test('link path inside a container block names no position', () => {
    const keyGenerator = createTestKeyGenerator()
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
    )
    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: resolveTestbedContainers(schema, [
          defineContainer({type: 'callout', arrayField: 'content'}),
        ]),
        value: [
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _key: keyGenerator(),
            _type: 'callout',
            content: [
              {
                _key: keyGenerator(),
                _type: 'block',
                children: [
                  {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    })
    expect(
      namesMissingTarget(snapshot, {
        anchor: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'markDefs',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'markDefs',
            {_key: 'k9'},
          ],
          offset: 0,
        },
      }),
    ).toEqual(true)
  })
})
