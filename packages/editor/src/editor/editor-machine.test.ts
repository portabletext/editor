import type {Patch} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, describe, onTestFinished, test, vi} from 'vitest'
import {createActor} from 'xstate'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {apply} from '../engine/core/apply'
import {inTestChange} from '../engine/core/change.test-utils'
import {normalize} from '../engine/editor/normalize'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {resolveTestbedContainers} from '../traversal/node-traversal-testbed'
import {createEditorEngine} from './create-editor-engine'
import {editorMachine} from './editor-machine'
import {createMutationBatcher} from './mutation-batcher'
import {createRelay} from './relay'

describe('deferred local patches with a compact incoming patch at the root', () => {
  test('Scenario: a compact incoming patch leaves deferred normalization patches in place', () => {
    const {editorActor, editLocally, emittedPatches, consoleCalls, getValue} =
      setUpPristineEditor([
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 's0', text: 'foo'},
            {_type: 'span', _key: 's1', text: 'bar'},
          ],
          markDefs: [{_type: 'link', _key: 'm0', href: 'https://a'}],
        },
      ])

    editorActor.send({
      type: 'internal.apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 's1'}, 'marks', 0, 0],
        },
      ],
    })
    editLocally({
      type: 'insert.text',
      path: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 6,
      text: 'baz',
    })

    expect(emittedPatches).toEqual([
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'b0'}, 'children', {_key: 's1'}, 'marks'],
        value: [],
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'marks'],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
      {
        origin: 'local',
        type: 'unset',
        path: [{_key: 'b0'}, 'children', {_key: 's1'}],
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'b0'}, 'style'],
        value: 'normal',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'b0'}, 'markDefs'],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
        value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
      },
    ])
    expect(getValue()).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foobarbaz', marks: []}],
        style: 'normal',
        markDefs: [],
      },
    ])
    expect(consoleCalls()).toEqual({error: [], warn: []})
  })

  test('Scenario: a full incoming patch drops its conflicting deferred patch and a compact one keeps its deferred patch', () => {
    const {editorActor, editLocally, emittedPatches, consoleCalls, getValue} =
      setUpPristineEditor([
        {
          _type: 'block',
          _key: 'b0',
          children: [
            {_type: 'span', _key: 's0', text: 'foo'},
            {_type: 'span', _key: 's1', text: 'bar'},
          ],
          markDefs: [{_type: 'link', _key: 'm0', href: 'https://a'}],
        },
      ])

    editorActor.send({
      type: 'internal.apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'b0'}, 'children', {_key: 's1'}, 'marks'],
        },
        {type: 'unset', path: [{_key: 'b0'}, 'style', 0, 0]},
      ],
    })
    editLocally({
      type: 'insert.text',
      path: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 6,
      text: 'baz',
    })

    expect(emittedPatches).toEqual([
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'marks'],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'b0'}, 'style'],
        value: 'normal',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'b0'}, 'markDefs'],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
        value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
      },
    ])
    expect(getValue()).toEqual([
      {
        _type: 'block',
        _key: 'b0',
        children: [{_type: 'span', _key: 's0', text: 'foobarbaz', marks: []}],
        style: 'normal',
        markDefs: [],
      },
    ])
    expect(consoleCalls()).toEqual({error: [], warn: []})
  })
})

describe('deferred local patches with a compact incoming patch inside a callout', () => {
  test('Scenario: a compact incoming patch leaves deferred normalization patches in place', () => {
    const {editorActor, editLocally, emittedPatches, consoleCalls, getValue} =
      setUpPristineEditor([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foo'},
                {_type: 'span', _key: 's1', text: 'bar'},
              ],
              markDefs: [{_type: 'link', _key: 'm0', href: 'https://a'}],
            },
          ],
        },
      ])

    editorActor.send({
      type: 'internal.apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's1'},
            'marks',
            0,
            0,
          ],
        },
      ],
    })
    editLocally({
      type: 'insert.text',
      path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 6,
      text: 'baz',
    })

    expect(emittedPatches).toEqual([
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's1'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
      {
        origin: 'local',
        type: 'unset',
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's1'}],
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'style'],
        value: 'normal',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'markDefs'],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
      },
    ])
    expect(getValue()).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foobarbaz', marks: []},
            ],
            style: 'normal',
            markDefs: [],
          },
        ],
      },
    ])
    expect(consoleCalls()).toEqual({error: [], warn: []})
  })

  test('Scenario: a full incoming patch drops its conflicting deferred patch and a compact one keeps its deferred patch', () => {
    const {editorActor, editLocally, emittedPatches, consoleCalls, getValue} =
      setUpPristineEditor([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foo'},
                {_type: 'span', _key: 's1', text: 'bar'},
              ],
              markDefs: [{_type: 'link', _key: 'm0', href: 'https://a'}],
            },
          ],
        },
      ])

    editorActor.send({
      type: 'internal.apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's1'},
            'marks',
          ],
        },
        {
          type: 'unset',
          path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'style', 0, 0],
        },
      ],
    })
    editLocally({
      type: 'insert.text',
      path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 6,
      text: 'baz',
    })

    expect(emittedPatches).toEqual([
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'style'],
        value: 'normal',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'c0'}, 'content', {_key: 'b0'}, 'markDefs'],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
      },
    ])
    expect(getValue()).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foobarbaz', marks: []},
            ],
            style: 'normal',
            markDefs: [],
          },
        ],
      },
    ])
    expect(consoleCalls()).toEqual({error: [], warn: []})
  })
})

describe('deferred local patches with a compact incoming patch inside a callout inside a callout', () => {
  test('Scenario: a compact incoming patch leaves deferred normalization patches in place', () => {
    const {editorActor, editLocally, emittedPatches, consoleCalls, getValue} =
      setUpPristineEditor([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo'},
                    {_type: 'span', _key: 's1', text: 'bar'},
                  ],
                  markDefs: [{_type: 'link', _key: 'm0', href: 'https://a'}],
                },
              ],
            },
          ],
        },
      ])

    editorActor.send({
      type: 'internal.apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's1'},
            'marks',
            0,
            0,
          ],
        },
      ],
    })
    editLocally({
      type: 'insert.text',
      path: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 6,
      text: 'baz',
    })

    expect(emittedPatches).toEqual([
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's1'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
      {
        origin: 'local',
        type: 'unset',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's1'},
        ],
      },
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'style',
        ],
        value: 'normal',
      },
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'markDefs',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
      },
    ])
    expect(getValue()).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foobarbaz', marks: []},
                ],
                style: 'normal',
                markDefs: [],
              },
            ],
          },
        ],
      },
    ])
    expect(consoleCalls()).toEqual({error: [], warn: []})
  })

  test('Scenario: a full incoming patch drops its conflicting deferred patch and a compact one keeps its deferred patch', () => {
    const {editorActor, editLocally, emittedPatches, consoleCalls, getValue} =
      setUpPristineEditor([
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'callout',
              _key: 'c1',
              content: [
                {
                  _type: 'block',
                  _key: 'b0',
                  children: [
                    {_type: 'span', _key: 's0', text: 'foo'},
                    {_type: 'span', _key: 's1', text: 'bar'},
                  ],
                  markDefs: [{_type: 'link', _key: 'm0', href: 'https://a'}],
                },
              ],
            },
          ],
        },
      ])

    editorActor.send({
      type: 'internal.apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'children',
            {_key: 's1'},
            'marks',
          ],
        },
        {
          type: 'unset',
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'c1'},
            'content',
            {_key: 'b0'},
            'style',
            0,
            0,
          ],
        },
      ],
    })
    editLocally({
      type: 'insert.text',
      path: [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0'},
        'children',
        {_key: 's0'},
      ],
      offset: 6,
      text: 'baz',
    })

    expect(emittedPatches).toEqual([
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'style',
        ],
        value: 'normal',
      },
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'markDefs',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'c0'},
          'content',
          {_key: 'c1'},
          'content',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
      },
    ])
    expect(getValue()).toEqual([
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foobarbaz', marks: []},
                ],
                style: 'normal',
                markDefs: [],
              },
            ],
          },
        ],
      },
    ])
    expect(consoleCalls()).toEqual({error: [], warn: []})
  })
})

describe('deferred local patches with a compact incoming patch inside a field with its own sub-schema', () => {
  test('Scenario: a compact incoming patch leaves deferred normalization patches in place', () => {
    const {editorActor, editLocally, emittedPatches, consoleCalls, getValue} =
      setUpPristineEditor([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foo'},
                {_type: 'span', _key: 's1', text: 'bar'},
              ],
              markDefs: [{_type: 'link', _key: 'm0', href: 'https://a'}],
            },
          ],
        },
      ])

    editorActor.send({
      type: 'internal.apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's1'},
            'marks',
            0,
            0,
          ],
        },
      ],
    })
    editLocally({
      type: 'insert.text',
      path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 6,
      text: 'baz',
    })

    expect(emittedPatches).toEqual([
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's1'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
      {
        origin: 'local',
        type: 'unset',
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's1'}],
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'style'],
        value: 'normal',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'markDefs'],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
      },
    ])
    expect(getValue()).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foobarbaz', marks: []},
            ],
            style: 'normal',
            markDefs: [],
          },
        ],
      },
    ])
    expect(consoleCalls()).toEqual({error: [], warn: []})
  })

  test('Scenario: a full incoming patch drops its conflicting deferred patch and a compact one keeps its deferred patch', () => {
    const {editorActor, editLocally, emittedPatches, consoleCalls, getValue} =
      setUpPristineEditor([
        {
          _type: 'note',
          _key: 'n0',
          body: [
            {
              _type: 'block',
              _key: 'b0',
              children: [
                {_type: 'span', _key: 's0', text: 'foo'},
                {_type: 'span', _key: 's1', text: 'bar'},
              ],
              markDefs: [{_type: 'link', _key: 'm0', href: 'https://a'}],
            },
          ],
        },
      ])

    editorActor.send({
      type: 'internal.apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'n0'},
            'body',
            {_key: 'b0'},
            'children',
            {_key: 's1'},
            'marks',
          ],
        },
        {
          type: 'unset',
          path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'style', 0, 0],
        },
      ],
    })
    editLocally({
      type: 'insert.text',
      path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 6,
      text: 'baz',
    })

    expect(emittedPatches).toEqual([
      {
        origin: 'local',
        type: 'set',
        path: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'marks',
        ],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'style'],
        value: 'normal',
      },
      {
        origin: 'local',
        type: 'set',
        path: [{_key: 'n0'}, 'body', {_key: 'b0'}, 'markDefs'],
        value: [],
      },
      {
        origin: 'local',
        type: 'diffMatchPatch',
        path: [
          {_key: 'n0'},
          'body',
          {_key: 'b0'},
          'children',
          {_key: 's0'},
          'text',
        ],
        value: '@@ -1,6 +1,9 @@\n foobar\n+baz\n',
      },
    ])
    expect(getValue()).toEqual([
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foobarbaz', marks: []},
            ],
            style: 'normal',
            markDefs: [],
          },
        ],
      },
    ])
    expect(consoleCalls()).toEqual({error: [], warn: []})
  })
})

function setUpPristineEditor(value: Array<PortableTextBlock>) {
  const consoleError = vi.spyOn(console, 'error')
  const consoleWarn = vi.spyOn(console, 'warn')
  const schema = compileSchema(
    defineSchema({
      ...textBlockDepthsSchemaDefinition,
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    }),
  )
  const containers = resolveTestbedContainers(schema, textBlockDepthsContainers)
  const editorActor = createActor(editorMachine, {
    input: {
      keyGenerator: createTestKeyGenerator('generated-'),
      schema,
    },
  })
  const subscriptions: Array<() => () => void> = []
  editorActor.start()
  const engine = createEditorEngine({editorActor, subscriptions})
  const relay = createRelay()
  subscriptions.push(
    createMutationBatcher({editorActor, editorEngine: engine, relay}).subscribe,
  )
  const emittedPatches: Array<Patch> = []
  subscriptions.push(() => {
    const subscription = relay.on('patch', (event) => {
      emittedPatches.push(event.patch)
    })
    return () => subscription.unsubscribe()
  })
  relay.start()
  editorActor.send({type: 'add editor engine', editor: engine})
  const unsubscribers = subscriptions.map((subscribe) => subscribe())
  editorActor.send({type: 'done syncing value'})

  engine.snapshot.context.containers = containers
  engine.snapshot.context.value = structuredClone(value)
  buildIndexMaps(engine.snapshot.context, {
    blockIndexMap: engine.blockIndexMap,
  })

  inTestChange(engine, () => normalize(engine, {force: true}))

  onTestFinished(() => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
    editorActor.stop()
    consoleError.mockRestore()
    consoleWarn.mockRestore()
  })

  const consoleCalls = () => ({
    error: consoleError.mock.calls,
    warn: consoleWarn.mock.calls,
  })

  const editLocally = (operation: Parameters<typeof apply>[1]): void => {
    inTestChange(engine, () => apply(engine, operation))
  }

  const getValue = () => engine.snapshot.context.value

  return {editorActor, editLocally, emittedPatches, consoleCalls, getValue}
}
