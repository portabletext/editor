import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {useEffect} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {
  useApplicableSchema,
  type ApplicableSchema,
} from './use-applicable-schema'
import {useToolbarSchema} from './use-toolbar-schema'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}],
  inlineObjects: [{name: 'mention', fields: []}],
  blockObjects: [
    {name: 'image', fields: []},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              // Sub-schema only allows the `code` decorator and `code` style.
              decorators: [{name: 'code'}],
              styles: [{name: 'code'}],
            },
          ],
        },
      ],
    },
  ],
})

const containers = [
  defineContainer<typeof schemaDefinition>({
    scope: '$..callout',
    field: 'content',
    render: ({attributes, children}) => (
      <div data-testid="callout" {...attributes}>
        {children}
      </div>
    ),
  }),
]

function ToolbarProbe(props: {
  onSchema: (schema: ReturnType<typeof useToolbarSchema>) => void
}) {
  const schema = useToolbarSchema({})
  useEffect(() => {
    props.onSchema(schema)
  }, [schema, props])
  return null
}

function ApplicableProbe(props: {
  onApplicable: (applicable: ApplicableSchema) => void
}) {
  const applicable = useApplicableSchema()
  useEffect(() => {
    props.onApplicable(applicable)
  }, [applicable, props])
  return null
}

describe('useToolbarSchema', () => {
  test('returns the union of every name reachable across root and registered containers', async () => {
    const captures: Array<ReturnType<typeof useToolbarSchema>> = []
    const onSchema = (schema: ReturnType<typeof useToolbarSchema>) => {
      captures.push(schema)
    }

    await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'r1',
          children: [{_type: 'span', _key: 's1', text: 'root', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <ContainerPlugin containers={containers} />
          <ToolbarProbe onSchema={onSchema} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(captures.length).toBeGreaterThan(0)
    })

    const last = captures.at(-1)!
    // Union: root's strong/em + callout's code
    expect(last.decorators.map((d) => d.name)).toEqual(['strong', 'em', 'code'])
    // Union: root's normal/h1/h2 + callout's code
    expect(last.styles.map((s) => s.name)).toEqual([
      'normal',
      'h1',
      'h2',
      'code',
    ])
  })
})

describe('useApplicableSchema', () => {
  test('returns the focus block sub-schema when the caret is in a single text block', async () => {
    const captures: Array<ApplicableSchema> = []
    const onApplicable = (applicable: ApplicableSchema) => {
      captures.push(applicable)
    }

    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'r1',
          children: [{_type: 'span', _key: 's1', text: 'root', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's2', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <ContainerPlugin containers={containers} />
          <ApplicableProbe onApplicable={onApplicable} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(captures.length).toBeGreaterThan(0)
    })

    // Place caret in root block
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'r1'}, 'children', {_key: 's1'}], offset: 0},
        focus: {path: [{_key: 'r1'}, 'children', {_key: 's1'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      const last = captures.at(-1)!
      expect([...last.decorators]).toEqual(['strong', 'em'])
      expect([...last.styles]).toEqual(['normal', 'h1', 'h2'])
      expect([...last.inlineObjects]).toEqual(['mention'])
    })

    // Move caret into the callout's text block
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's2'},
          ],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      const last = captures.at(-1)!
      expect([...last.decorators]).toEqual(['code'])
      expect([...last.styles]).toEqual(['code'])
    })
  })

  test('returns the union of sub-schemas across all text blocks the selection covers', async () => {
    const captures: Array<ApplicableSchema> = []
    const onApplicable = (applicable: ApplicableSchema) => {
      captures.push(applicable)
    }

    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'r1',
          children: [{_type: 'span', _key: 's1', text: 'root', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's2', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <ContainerPlugin containers={containers} />
          <ApplicableProbe onApplicable={onApplicable} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(captures.length).toBeGreaterThan(0)
    })

    // Select from root block all the way into the callout's text block
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'r1'}, 'children', {_key: 's1'}], offset: 0},
        focus: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's2'},
          ],
          offset: 6,
        },
      },
    })

    await vi.waitFor(() => {
      const last = captures.at(-1)!
      // Root has strong/em; callout has code. Union enables every name
      // available in any covered block - the underlying operations
      // per-block-filter spans/blocks against their sub-schemas, so the
      // toolbar reflects "will this produce any effect?" semantics.
      expect([...last.decorators].sort()).toEqual(['code', 'em', 'strong'])
      expect([...last.styles].sort()).toEqual(['code', 'h1', 'h2', 'normal'])
    })
  })

  test('returns empty text-only sets when the selection is on a void block', async () => {
    const captures: Array<ApplicableSchema> = []
    const onApplicable = (applicable: ApplicableSchema) => {
      captures.push(applicable)
    }

    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [{_type: 'image', _key: 'img1'}],
      children: (
        <>
          <ContainerPlugin containers={containers} />
          <ApplicableProbe onApplicable={onApplicable} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(captures.length).toBeGreaterThan(0)
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'img1'}], offset: 0},
        focus: {path: [{_key: 'img1'}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      const last = captures.at(-1)!
      // Text-only categories empty: void blocks have no spans to mark up
      expect([...last.decorators]).toEqual([])
      expect([...last.annotations]).toEqual([])
      expect([...last.lists]).toEqual([])
      expect([...last.styles]).toEqual([])
      // Insertion categories still meaningful: what can I insert here?
      expect([...last.blockObjects]).toEqual(['image', 'callout'])
      expect([...last.inlineObjects]).toEqual(['mention'])
    })
  })

  test('returns empty sets when there is no selection', async () => {
    const captures: Array<ApplicableSchema> = []
    const onApplicable = (applicable: ApplicableSchema) => {
      captures.push(applicable)
    }

    await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'r1',
          children: [{_type: 'span', _key: 's1', text: 'root', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <>
          <ContainerPlugin containers={containers} />
          <ApplicableProbe onApplicable={onApplicable} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(captures.length).toBeGreaterThan(0)
      const last = captures.at(-1)!
      // No selection by default at mount
      expect([...last.decorators]).toEqual([])
      expect([...last.annotations]).toEqual([])
      expect([...last.lists]).toEqual([])
      expect([...last.styles]).toEqual([])
      expect([...last.blockObjects]).toEqual([])
      expect([...last.inlineObjects]).toEqual([])
    })
  })
})
