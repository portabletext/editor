import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  type PortableTextObject,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {addFieldLifecyclePatches} from './field-lifecycle-patches'

const schema = compileSchema(
  defineSchema({
    styles: [{name: 'normal'}, {name: 'h1'}],
    blockObjects: [{name: 'image'}],
  }),
)

describe(addFieldLifecyclePatches.name, () => {
  test('the first keystroke into the placeholder inserts the placeholder into a new field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'insert.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'f',
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, 'f')],
          patches: [
            diffMatchPatch('', 'f', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        setIfMissing([], []),
        insert([textBlock(blockKey, spanKey, '')], 'before', [0]),
        diffMatchPatch('', 'f', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('removing the last character unsets the field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'remove.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'f',
          },
          beforeValue: [textBlock(blockKey, spanKey, 'f')],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [
            diffMatchPatch('f', '', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        diffMatchPatch('f', '', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
        unset([]),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: true},
    })
  })

  test('typing after the field was unset rebuilds it', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: true},
        {
          operation: {
            type: 'insert.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'f',
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, 'f')],
          patches: [
            diffMatchPatch('', 'f', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        setIfMissing([], []),
        insert([textBlock(blockKey, spanKey, '')], 'before', [0]),
        diffMatchPatch('', 'f', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('typing into a pristine block the host persisted patches the text only', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {
          lastSyncedValue: [textBlock(blockKey, spanKey, '')],
          valueUnsetEmitted: false,
        },
        {
          operation: {
            type: 'insert.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'f',
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, 'f')],
          patches: [
            diffMatchPatch('', 'f', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        diffMatchPatch('', 'f', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      state: {
        lastSyncedValue: [textBlock(blockKey, spanKey, '')],
        valueUnsetEmitted: false,
      },
    })
  })

  test('removing the last character of a block the host persisted as pristine patches the text only', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {
          lastSyncedValue: [textBlock(blockKey, spanKey, '')],
          valueUnsetEmitted: false,
        },
        {
          operation: {
            type: 'remove.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'f',
          },
          beforeValue: [textBlock(blockKey, spanKey, 'f')],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [
            diffMatchPatch('f', '', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        diffMatchPatch('f', '', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      state: {
        lastSyncedValue: [textBlock(blockKey, spanKey, '')],
        valueUnsetEmitted: false,
      },
    })
  })

  test('typing into a pristine block that is the initial value patches the text only', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'insert.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'f',
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, 'f')],
          patches: [
            diffMatchPatch('', 'f', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: [textBlock(blockKey, spanKey, '')]},
      ),
    ).toEqual({
      patches: [
        diffMatchPatch('', 'f', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('removing the last character back to a pristine initial value patches the text only', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'remove.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'f',
          },
          beforeValue: [textBlock(blockKey, spanKey, 'f')],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [
            diffMatchPatch('f', '', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: [textBlock(blockKey, spanKey, '')]},
      ),
    ).toEqual({
      patches: [
        diffMatchPatch('f', '', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('typing over a stale echo of the cleared field rebuilds it and forgets the echo', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {
          lastSyncedValue: [textBlock(blockKey, spanKey, '')],
          valueUnsetEmitted: true,
        },
        {
          operation: {
            type: 'insert.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'b',
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, 'b')],
          patches: [
            diffMatchPatch('', 'b', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        setIfMissing([], []),
        insert([textBlock(blockKey, spanKey, '')], 'before', [0]),
        diffMatchPatch('', 'b', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('typing into the placeholder while a different value is recorded as synced keeps the recording', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {
          lastSyncedValue: [textBlock(blockKey, spanKey, 'foo')],
          valueUnsetEmitted: true,
        },
        {
          operation: {
            type: 'insert.text',
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
            text: 'b',
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, 'b')],
          patches: [
            diffMatchPatch('', 'b', [
              {_key: blockKey},
              'children',
              {_key: spanKey},
              'text',
            ]),
          ],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        setIfMissing([], []),
        insert([textBlock(blockKey, spanKey, '')], 'before', [0]),
        diffMatchPatch('', 'b', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      state: {
        lastSyncedValue: [textBlock(blockKey, spanKey, 'foo')],
        valueUnsetEmitted: false,
      },
    })
  })

  test('setting a non-default style on the placeholder inserts the placeholder into a new field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'set',
            path: [{_key: blockKey}, 'style'],
            value: 'h1',
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, '', 'h1')],
          patches: [set('h1', [{_key: blockKey}, 'style'])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        setIfMissing([], []),
        insert([textBlock(blockKey, spanKey, '')], 'before', [0]),
        set('h1', [{_key: blockKey}, 'style']),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('setting the default style on the placeholder does not unset the field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'set',
            path: [{_key: blockKey}, 'style'],
            value: 'normal',
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [set('normal', [{_key: blockKey}, 'style'])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        setIfMissing([], []),
        set('normal', [{_key: blockKey}, 'style']),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('setting the style of an empty block back to the default unsets the field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'set',
            path: [{_key: blockKey}, 'style'],
            value: 'normal',
          },
          beforeValue: [textBlock(blockKey, spanKey, '', 'h1')],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [set('normal', [{_key: blockKey}, 'style'])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [set('normal', [{_key: blockKey}, 'style']), unset([])],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: true},
    })
  })

  test('removing a lone block object unsets the block only', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: [image(imageKey)], valueUnsetEmitted: false},
        {
          operation: {type: 'unset', path: [{_key: imageKey}]},
          beforeValue: [image(imageKey)],
          afterValue: [],
          patches: [unset([{_key: imageKey}])],
        },
        {schema, initialValue: [image(imageKey)]},
      ),
    ).toEqual({
      patches: [unset([{_key: imageKey}])],
      state: {lastSyncedValue: [image(imageKey)], valueUnsetEmitted: false},
    })
  })

  test('removing the placeholder of a field without a value inserts the placeholder, then unsets it', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {type: 'unset', path: [{_key: blockKey}]},
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [],
          patches: [unset([{_key: blockKey}])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        setIfMissing([], []),
        insert([textBlock(blockKey, spanKey, '')], 'before', [0]),
        unset([{_key: blockKey}]),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('inserting a pristine block into an empty value records it as synced', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'insert',
            path: [0],
            node: textBlock(blockKey, spanKey, ''),
            position: 'before',
          },
          beforeValue: [],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [insert([textBlock(blockKey, spanKey, '')], 'before', [0])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [insert([textBlock(blockKey, spanKey, '')], 'before', [0])],
      state: {
        lastSyncedValue: [textBlock(blockKey, spanKey, '')],
        valueUnsetEmitted: false,
      },
    })
  })

  test('inserting into an empty value after the field was unset rebuilds it first', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: true},
        {
          operation: {
            type: 'insert',
            path: [0],
            node: image(imageKey),
            position: 'before',
          },
          beforeValue: [],
          afterValue: [image(imageKey)],
          patches: [insert([image(imageKey)], 'before', [0])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [setIfMissing([], []), insert([image(imageKey)], 'before', [0])],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('a selection change emits nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {
          lastSyncedValue: [textBlock(blockKey, spanKey, 'foo')],
          valueUnsetEmitted: false,
        },
        {
          operation: {
            type: 'set.selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 0,
              },
              focus: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 3,
              },
            },
          },
          beforeValue: [textBlock(blockKey, spanKey, 'foo')],
          afterValue: [textBlock(blockKey, spanKey, 'foo')],
          patches: [],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [],
      state: {
        lastSyncedValue: [textBlock(blockKey, spanKey, 'foo')],
        valueUnsetEmitted: false,
      },
    })
  })

  test('a selection change in the placeholder emits nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {
            type: 'set.selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 0,
              },
              focus: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 0,
              },
            },
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })

  test('a selection change over a stale echo of the cleared field emits nothing and keeps the echo', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {
          lastSyncedValue: [textBlock(blockKey, spanKey, '')],
          valueUnsetEmitted: true,
        },
        {
          operation: {
            type: 'set.selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 0,
              },
              focus: {
                path: [{_key: blockKey}, 'children', {_key: spanKey}],
                offset: 0,
              },
            },
          },
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [],
      state: {
        lastSyncedValue: [textBlock(blockKey, spanKey, '')],
        valueUnsetEmitted: true,
      },
    })
  })

  test('a selection change in an unset empty value emits nothing', () => {
    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: true},
        {
          operation: {
            type: 'set.selection',
            properties: {anchor: {path: [], offset: 0}},
            newProperties: {anchor: {path: [], offset: 0}},
          },
          beforeValue: [],
          afterValue: [],
          patches: [],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: true},
    })
  })

  test('removing the other block so only a pristine block remains unsets the field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {
          lastSyncedValue: [textBlock(blockKey, spanKey, ''), image(imageKey)],
          valueUnsetEmitted: false,
        },
        {
          operation: {type: 'unset', path: [{_key: imageKey}]},
          beforeValue: [textBlock(blockKey, spanKey, ''), image(imageKey)],
          afterValue: [textBlock(blockKey, spanKey, '')],
          patches: [unset([{_key: imageKey}])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [unset([{_key: imageKey}]), unset([])],
      state: {
        lastSyncedValue: [textBlock(blockKey, spanKey, ''), image(imageKey)],
        valueUnsetEmitted: true,
      },
    })
  })

  test('a root `unset` unsets the field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {
          lastSyncedValue: [textBlock(blockKey, spanKey, 'foo')],
          valueUnsetEmitted: false,
        },
        {
          operation: {type: 'unset', path: []},
          beforeValue: [textBlock(blockKey, spanKey, 'foo')],
          afterValue: [],
          patches: [unset([])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [unset([])],
      state: {
        lastSyncedValue: [textBlock(blockKey, spanKey, 'foo')],
        valueUnsetEmitted: true,
      },
    })
  })

  test('a root `unset` of the placeholder of a field without a value inserts the placeholder, then unsets the field', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: false},
        {
          operation: {type: 'unset', path: []},
          beforeValue: [textBlock(blockKey, spanKey, '')],
          afterValue: [],
          patches: [unset([])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [
        setIfMissing([], []),
        insert([textBlock(blockKey, spanKey, '')], 'before', [0]),
        unset([]),
      ],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: true},
    })
  })

  test('a root `unset` of an unset empty value is not preceded by `setIfMissing`', () => {
    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: true},
        {
          operation: {type: 'unset', path: []},
          beforeValue: [],
          afterValue: [],
          patches: [unset([])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [unset([])],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: true},
    })
  })

  test('a root `set` of an unset empty value rebuilds the field without `setIfMissing`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      addFieldLifecyclePatches(
        {lastSyncedValue: undefined, valueUnsetEmitted: true},
        {
          operation: {
            type: 'set',
            path: [],
            value: [textBlock(blockKey, spanKey, 'foo')],
          },
          beforeValue: [],
          afterValue: [textBlock(blockKey, spanKey, 'foo')],
          patches: [set([textBlock(blockKey, spanKey, 'foo')], [])],
        },
        {schema, initialValue: undefined},
      ),
    ).toEqual({
      patches: [set([textBlock(blockKey, spanKey, 'foo')], [])],
      state: {lastSyncedValue: undefined, valueUnsetEmitted: false},
    })
  })
})

function textBlock(
  key: string,
  spanKey: string,
  text: string,
  style = 'normal',
): PortableTextTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style,
  }
}

function image(key: string): PortableTextObject {
  return {_type: 'image', _key: key}
}
