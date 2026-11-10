import {
  defineContainer,
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorSelection,
} from '@portabletext/editor'
import {EditorRefPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {isKeyedSegment} from '@portabletext/editor/utils'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {
  createRef,
  StrictMode,
  Suspense,
  useCallback,
  type PropsWithChildren,
} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {COMMENT_INDICATORS} from './comments-anchoring'

const commentState = vi.hoisted(() => ({
  comments: [] as Array<unknown>,
  unstable: false,
}))
const renderedComments: Array<unknown> = []
const commentRenderCounts = new Map<string, number>()
const highlightRenderCounts = new Map<string, number>()
vi.mock('@sanity/sdk-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sanity/sdk-react')>()
  return {
    ...actual,
    useComments: () => ({
      comments: commentState.unstable
        ? [...commentState.comments]
        : commentState.comments,
      isPending: false,
    }),
    useCommentActions: () => ({createComment: () => Promise.reject()}),
  }
})

const {SDKCommentsPlugin, useSDKCommentDecorations} =
  await import('./plugin.sdk-comments')

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const containers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

type Block = {key: string; span: string}

type LayoutContainerKeys = {
  callout: string
  innerCallout: string
  table: string
  row: string
  cell: string
}

const layouts = [
  {
    name: 'root',
    build: () => ({
      wrap: (block: unknown) => [block],
      prefix: [] as NonNullable<EditorSelection>['anchor']['path'],
      fieldPath: 'content',
    }),
  },
  {
    name: 'callout in callout',
    build: (keys: LayoutContainerKeys) => ({
      wrap: (block: unknown) => [
        {
          _type: 'callout',
          _key: keys.callout,
          content: [
            {_type: 'callout', _key: keys.innerCallout, content: [block]},
          ],
        },
      ],
      prefix: [
        {_key: keys.callout},
        'content',
        {_key: keys.innerCallout},
        'content',
      ] as NonNullable<EditorSelection>['anchor']['path'],
      fieldPath: `content[_key=="${keys.callout}"].content[_key=="${keys.innerCallout}"].content`,
    }),
  },
  {
    name: 'table cell',
    build: (keys: LayoutContainerKeys) => ({
      wrap: (block: unknown) => [
        {
          _type: 'table',
          _key: keys.table,
          rows: [
            {
              _type: 'row',
              _key: keys.row,
              cells: [{_type: 'cell', _key: keys.cell, content: [block]}],
            },
          ],
        },
      ],
      prefix: [
        {_key: keys.table},
        'rows',
        {_key: keys.row},
        'cells',
        {_key: keys.cell},
        'content',
      ] as NonNullable<EditorSelection>['anchor']['path'],
      fieldPath: `content[_key=="${keys.table}"].rows[_key=="${keys.row}"].cells[_key=="${keys.cell}"].content`,
    }),
  },
]

function createFixture(layout: (typeof layouts)[number]) {
  const nextKey = createTestKeyGenerator()
  const block = (): Block => ({key: nextKey(), span: nextKey()})
  const first = block()
  const second = block()
  const many = Array.from({length: 20}, block)
  const {wrap, prefix, fieldPath} = layout.build({
    callout: nextKey(),
    innerCallout: nextKey(),
    table: nextKey(),
    row: nextKey(),
    cell: nextKey(),
  })
  const spanPathOf = (target: Block) => [
    ...prefix,
    {_key: target.key},
    'children',
    {_key: target.span},
  ]

  function textBlock(target: Block, text: string) {
    return {
      _type: 'block',
      _key: target.key,
      markDefs: [],
      children: [{_type: 'span', _key: target.span, text, marks: []}],
    }
  }

  function appendToField(
    value: Array<PortableTextBlock>,
    blocks: Array<unknown>,
  ) {
    let array = value as Array<Record<string, unknown>>
    let node: Record<string, unknown> | undefined
    for (const segment of prefix) {
      if (isKeyedSegment(segment)) {
        node = array.find((item) => item['_key'] === segment._key)
      } else if (typeof segment === 'string') {
        array = node?.[segment] as Array<Record<string, unknown>>
      } else {
        throw new Error('Test layouts do not use index tuple path segments')
      }
    }
    array.push(...(blocks as Array<Record<string, unknown>>))
    return value
  }

  return {
    first,
    second,
    many,
    wrap,
    prefix,
    fieldPath,
    spanPath: spanPathOf(first),
    secondSpanPath: spanPathOf(second),
    textBlock,
    twoBlocks(firstText: string, secondText: string): Array<PortableTextBlock> {
      return appendToField(
        wrap(textBlock(first, firstText)) as Array<PortableTextBlock>,
        [textBlock(second, secondText)],
      )
    },
    manyBlocks(count: number): Array<PortableTextBlock> {
      return appendToField(
        wrap(textBlock(many[0]!, 'foo bar baz')) as Array<PortableTextBlock>,
        many.slice(1, count).map((target) => textBlock(target, 'foo bar baz')),
      )
    },
  }
}

function comment(
  id: string,
  fieldPath: string,
  blockKeyOrMembers: string | Array<{_key: string; text: string}>,
  marked?: string,
) {
  const value =
    typeof blockKeyOrMembers === 'string'
      ? [{_key: blockKeyOrMembers, text: marked!}]
      : blockKeyOrMembers
  return {
    _id: id,
    id,
    status: 'open',
    fieldPath,
    selection: {type: 'text', value},
  }
}

function reply(id: string, parentCommentId: string, fieldPath: string) {
  return {
    _id: id,
    id,
    status: 'open',
    parentCommentId,
    fieldPath,
  }
}

const [open, close] = COMMENT_INDICATORS

function Highlights(hostProps: {tick: number}) {
  const renderDecoration = useCallback(
    (commentValue: unknown) => {
      renderedComments.push(commentValue)
      const id = (commentValue as {id: string}).id
      commentRenderCounts.set(id, (commentRenderCounts.get(id) ?? 0) + 1)
      return (renderProps: PropsWithChildren) => {
        highlightRenderCounts.set(id, (highlightRenderCounts.get(id) ?? 0) + 1)
        return (
          <span data-testid={`comment-${id}`} data-tick={hostProps.tick}>
            {renderProps.children}
          </span>
        )
      }
    },
    [hostProps.tick],
  )
  useSDKCommentDecorations({
    documentId: 'doc',
    documentType: 'article',
    path: 'content',
    renderDecoration,
  })
  return null
}

function InlineHighlights(hostProps: {tick: number}) {
  useSDKCommentDecorations({
    documentId: 'doc',
    documentType: 'article',
    path: 'content',
    renderDecoration: (commentValue: unknown) => {
      const id = (commentValue as {id: string}).id
      return (renderProps: PropsWithChildren) => {
        highlightRenderCounts.set(id, (highlightRenderCounts.get(id) ?? 0) + 1)
        return (
          <span data-testid={`comment-${id}`} data-tick={hostProps.tick}>
            {renderProps.children}
          </span>
        )
      }
    },
  })
  return null
}

function App(props: {
  value: Array<PortableTextBlock> | undefined
  editorRef: React.RefObject<Editor | null>
  tick: number
  strict?: boolean
  inlineRenderer?: boolean
}) {
  const tree = (
    <EditorProvider
      initialConfig={{schemaDefinition, initialValue: props.value}}
    >
      <EditorRefPlugin ref={props.editorRef} />
      <NodePlugin nodes={containers} />
      <PortableTextEditable data-testid="editable" />
      <Suspense fallback={null}>
        {props.inlineRenderer ? (
          <InlineHighlights key="h" tick={props.tick} />
        ) : (
          <Highlights key="h" tick={props.tick} />
        )}
      </Suspense>
      <span data-testid="host-tick" data-tick={props.tick} />
    </EditorProvider>
  )
  return props.strict ? <StrictMode>{tree}</StrictMode> : tree
}

function highlighted(id: string): string | null {
  const elements = document.querySelectorAll(`[data-testid="comment-${id}"]`)
  if (elements.length === 0) {
    return null
  }
  return [...elements].map((element) => element.textContent).join('')
}

function tickOf(id: string): string | null | undefined {
  return document
    .querySelector(`[data-testid="comment-${id}"]`)
    ?.getAttribute('data-tick')
}

function highlightStart(id: string): number | null {
  const editable = document.querySelector('[data-testid="editable"]')
  const highlight = document.querySelector(`[data-testid="comment-${id}"]`)
  if (!editable || !highlight) {
    return null
  }
  const range = document.createRange()
  range.setStart(editable, 0)
  range.setEndBefore(highlight)
  return range.toString().length
}

describe.each(layouts)('comment highlights $name', (layout) => {
  test('Scenario: retyping a deleted comment and adding a reply draws it at its current offset', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 4},
        focus: {path: fx.spanPath, offset: 7},
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 0},
        focus: {path: fx.spanPath, offset: 0},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'hello '})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 10},
        focus: {path: fx.spanPath, offset: 10},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', fx.fieldPath),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)

    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        start: highlightStart('c'),
      }).toEqual({highlighted: 'bar', start: 10}),
    )
  })

  test('Scenario: typing before a comment, retyping it, and adding a reply draws it at its current offset', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 0},
        focus: {path: fx.spanPath, offset: 0},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 6},
        focus: {path: fx.spanPath, offset: 9},
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 6},
        focus: {path: fx.spanPath, offset: 6},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', fx.fieldPath),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        start: highlightStart('c'),
      }).toEqual({highlighted: 'bar', start: 6}),
    )
  })

  test('Scenario: moving a commented block and adding a reply draws it again', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.second.key, `one ${open}two${close} three`),
    ]
    const value = fx.twoBlocks('foo bar baz', 'one two three')
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
    editorRef.current!.send({
      type: 'move.block up',
      at: [...fx.prefix, {_key: fx.second.key}],
    } as never)
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', fx.fieldPath),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
  })

  test.each([false, true])(
    'Scenario: a moved-away highlight that is drawn again uses the current renderer in StrictMode %s',
    async (strict) => {
      const fx = createFixture(layout)
      const editorRef = createRef<Editor>()
      commentState.comments = [
        comment(
          'c',
          fx.fieldPath,
          fx.second.key,
          `one ${open}two${close} three`,
        ),
      ]
      const value = fx.twoBlocks('foo bar baz', 'one two three')
      const result = await render(
        <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
      )
      await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
      editorRef.current!.send({
        type: 'move.block up',
        at: [...fx.prefix, {_key: fx.second.key}],
      } as never)
      await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
      commentState.comments = [
        ...commentState.comments,
        reply('r', 'c', fx.fieldPath),
      ]
      await result.rerender(
        <App value={value} editorRef={editorRef} tick={1} strict={strict} />,
      )
      await vi.waitFor(() =>
        expect({text: highlighted('c'), tick: tickOf('c')}).toEqual({
          text: 'two',
          tick: '1',
        }),
      )
    },
  )

  test.each([false, true])(
    'Scenario: an unstable comments array draws and follows typing in StrictMode $strict',
    async (strict) => {
      const fx = createFixture(layout)
      const editorRef = createRef<Editor>()
      commentState.comments = [
        comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
      ]
      commentState.unstable = true
      try {
        const value = fx.wrap(
          fx.textBlock(fx.first, 'foo bar baz'),
        ) as Array<PortableTextBlock>
        await render(
          <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
        )
        await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
        editorRef.current!.send({
          type: 'select',
          at: {
            anchor: {path: fx.spanPath, offset: 0},
            focus: {path: fx.spanPath, offset: 0},
          },
        })
        editorRef.current!.send({type: 'insert.text', text: 'XY'})
        await vi.waitFor(() =>
          expect({
            highlighted: highlighted('c'),
            start: highlightStart('c'),
          }).toEqual({highlighted: 'bar', start: 6}),
        )
      } finally {
        commentState.unstable = false
      }
    },
  )

  if (layout.name === 'root') {
    test('Scenario: rendering receives the comment object returned by the SDK', async () => {
      const fx = createFixture(layout)
      const editorRef = createRef<Editor>()
      const sdkComment = {
        ...comment(
          'c',
          fx.fieldPath,
          fx.first.key,
          `foo ${open}bar${close} baz`,
        ),
        state: {error: new Error('comment failed')},
      }
      commentState.comments = [sdkComment]
      renderedComments.length = 0
      const value = fx.wrap(
        fx.textBlock(fx.first, 'foo bar baz'),
      ) as Array<PortableTextBlock>
      await render(<App value={value} editorRef={editorRef} tick={0} />)

      await vi.waitFor(() => expect(renderedComments.at(-1)).toBe(sdkComment))
    })
  }

  test('Scenario: a drawn anchor keeps the position tracked by the decoration layer', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 0},
        focus: {path: fx.spanPath, offset: 0},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'foo bar baz '})
    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        start: highlightStart('c'),
      }).toEqual({highlighted: 'bar', start: 16}),
    )
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        start: highlightStart('c'),
      }).toEqual({highlighted: 'bar', start: 16}),
    )
  })

  test('Scenario: two members of one comment in the same block both draw', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, [
        {_key: fx.first.key, text: `foo ${open}bar${close} baz`},
        {_key: fx.first.key, text: `foo bar ${open}baz${close}`},
      ]),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    await render(<App value={value} editorRef={editorRef} tick={0} />)
    await vi.waitFor(() =>
      expect(
        [...document.querySelectorAll('[data-testid="comment-c"]')].map(
          (element) => element.textContent,
        ),
      ).toEqual(['bar', 'baz']),
    )
  })

  test('Scenario: a comment spanning two blocks highlights both', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('m', fx.fieldPath, [
        {_key: fx.first.key, text: `foo ${open}bar baz${close}`},
        {_key: fx.second.key, text: `${open}one two${close} three`},
      ]),
    ]
    await render(
      <App
        value={fx.twoBlocks('foo bar baz', 'one two three')}
        editorRef={editorRef}
        tick={0}
      />,
    )

    await vi.waitFor(() => expect(highlighted('m')).toEqual('bar bazone two'))
  })

  test("Scenario: lost A stays lost when B's block arrives later", async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('a', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
      comment('b', fx.fieldPath, fx.second.key, `one ${open}two${close} three`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    await render(<App value={value} editorRef={editorRef} tick={0} />)
    await vi.waitFor(() => expect(highlighted('a')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 4},
        focus: {path: fx.spanPath, offset: 7},
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('a')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 4},
        focus: {path: fx.spanPath, offset: 4},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    editorRef.current!.send({
      type: 'insert.block',
      block: fx.textBlock(fx.second, 'one two three'),
      placement: 'after',
      at: {
        anchor: {path: fx.spanPath, offset: 11},
        focus: {path: fx.spanPath, offset: 11},
      },
      select: 'none',
    })

    await vi.waitFor(() =>
      expect({a: highlighted('a'), b: highlighted('b')}).toEqual({
        a: null,
        b: 'two',
      }),
    )
  })

  test('Scenario: lost A stays lost when typing elsewhere makes B resolvable', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('a', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
      comment('b', fx.fieldPath, fx.second.key, `one ${open}two${close} three`),
    ]
    await render(
      <App
        value={fx.twoBlocks('foo bar baz', 'one  three')}
        editorRef={editorRef}
        tick={0}
      />,
    )
    await vi.waitFor(() => expect(highlighted('a')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 4},
        focus: {path: fx.spanPath, offset: 7},
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('a')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 4},
        focus: {path: fx.spanPath, offset: 4},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.secondSpanPath, offset: 4},
        focus: {path: fx.secondSpanPath, offset: 4},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'two'})

    await vi.waitFor(() =>
      expect({a: highlighted('a'), b: highlighted('b')}).toEqual({
        a: null,
        b: 'two',
      }),
    )
  })

  test('Scenario: a comment whose text can no longer be found is hidden', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('a', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
      comment('b', fx.fieldPath, fx.second.key, `one ${open}two${close} three`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('a')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 7},
        focus: {path: fx.spanPath, offset: 11},
      },
    })
    editorRef.current!.send({
      type: 'insert.text',
      text: ' and something else entirely',
    })
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 0},
        focus: {path: fx.spanPath, offset: 4},
      },
    })
    editorRef.current!.send({
      type: 'insert.text',
      text: 'completely different words ',
    })
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 28},
        focus: {path: fx.spanPath, offset: 28},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'XX'})
    await vi.waitFor(() => expect(highlighted('a')).toEqual(null))

    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await expect
      .element(page.getByTestId('host-tick'))
      .toHaveAttribute('data-tick', '1')
    expect(highlighted('a')).toEqual(null)
    editorRef.current!.send({
      type: 'insert.block',
      block: fx.textBlock(fx.second, 'one two three'),
      placement: 'after',
      at: {
        anchor: {path: fx.spanPath, offset: 62},
        focus: {path: fx.spanPath, offset: 62},
      },
      select: 'none',
    })

    await vi.waitFor(() =>
      expect({a: highlighted('a'), b: highlighted('b')}).toEqual({
        a: null,
        b: 'two',
      }),
    )
  })

  test('Scenario: moved keeps the live position across an unrelated re-render and a re-resolution', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 0},
        focus: {path: fx.spanPath, offset: 0},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        start: highlightStart('c'),
      }).toEqual({highlighted: 'bar', start: 6}),
    )

    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await expect
      .element(page.getByTestId('host-tick'))
      .toHaveAttribute('data-tick', '1')
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 13},
        focus: {path: fx.spanPath, offset: 13},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: '!'})
    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        start: highlightStart('c'),
        text: document.querySelector('[data-testid="editable"]')?.textContent,
      }).toEqual({highlighted: 'bar', start: 6, text: 'XYfoo bar baz!'}),
    )
  })

  test('Scenario: lost drops the comment after retyping and a host render', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 4},
        focus: {path: fx.spanPath, offset: 7},
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 4},
        focus: {path: fx.spanPath, offset: 4},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})

    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await expect
      .element(page.getByTestId('host-tick'))
      .toHaveAttribute('data-tick', '1')
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 11},
        focus: {path: fx.spanPath, offset: 11},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: '!'})
    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        text: document.querySelector('[data-testid="editable"]')?.textContent,
      }).toEqual({highlighted: null, text: 'foo bar baz!'}),
    )
  })

  test('Scenario: comments that load after the value still resolve against the text', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = []
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()

    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })

  test('Scenario: value that arrives after the comments still resolves', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    await render(<App value={undefined} editorRef={editorRef} tick={0} />)
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()
    editorRef.current!.send({
      type: 'update value',
      value: fx.wrap(
        fx.textBlock(fx.first, 'foo bar baz'),
      ) as Array<PortableTextBlock>,
    })
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })

  test('Scenario: a changed comment list keeps other highlighted text nodes mounted', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    const before = document.querySelector(
      '[data-testid="comment-c"] [data-pt-text]',
    )!.firstChild!

    commentState.comments = [
      ...commentState.comments,
      {
        _id: 'reply',
        id: 'reply',
        status: 'open',
        parentCommentId: 'c',
        fieldPath: fx.fieldPath,
      },
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => {
      const after = document.querySelector(
        '[data-testid="comment-c"] [data-pt-text]',
      )!.firstChild!
      expect({connected: before.isConnected, same: before === after}).toEqual({
        connected: true,
        same: true,
      })
    })
  })

  test('Scenario: typing inside a highlight keeps the text node being typed into', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    await render(<App value={value} editorRef={editorRef} tick={0} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 5},
        focus: {path: fx.spanPath, offset: 5},
      },
    })
    const before = document.querySelector(
      '[data-testid="comment-c"] [data-pt-text]',
    )!.firstChild!
    await userEvent.keyboard('Q')
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bQar'))
    const after = document.querySelector(
      '[data-testid="comment-c"] [data-pt-text]',
    )!.firstChild!
    await userEvent.keyboard('W')
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bQWar'))
    expect({connected: before.isConnected, same: before === after}).toEqual({
      connected: true,
      same: true,
    })
  })

  test('Scenario: a drawn highlight keeps its renderer when the app commits a new one and the user types inside it', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await expect
      .element(page.getByTestId('host-tick'))
      .toHaveAttribute('data-tick', '1')
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.spanPath, offset: 5},
        focus: {path: fx.spanPath, offset: 5},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'Q'})

    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        start: highlightStart('c'),
        text: document.querySelector('[data-testid="editable"]')?.textContent,
        tick: document
          .querySelector('[data-testid="comment-c"]')
          ?.getAttribute('data-tick'),
      }).toEqual({
        highlighted: 'bQar',
        start: 4,
        text: 'foo bQar baz',
        tick: '0',
      }),
    )
  })

  test.each([false, true])(
    "Scenario: a reaction keeps drawn highlights' renderer and a reply draws a hidden one with the current renderer in StrictMode %s",
    async (strict) => {
      const fx = createFixture(layout)
      const editorRef = createRef<Editor>()
      const keyGenerator = createTestKeyGenerator()
      const original = comment(
        'c',
        fx.fieldPath,
        fx.first.key,
        `foo ${open}bar${close} baz`,
      )
      commentState.comments = [
        original,
        comment(
          'd',
          fx.fieldPath,
          fx.second.key,
          `one ${open}two${close} three`,
        ),
      ]
      const value = fx.twoBlocks('foo bar baz', 'one two three')
      const result = await render(
        <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
      )
      await vi.waitFor(() =>
        expect({c: highlighted('c'), d: highlighted('d')}).toEqual({
          c: 'bar',
          d: 'two',
        }),
      )

      editorRef.current!.send({
        type: 'select',
        at: {
          anchor: {path: fx.spanPath, offset: 5},
          focus: {path: fx.spanPath, offset: 5},
        },
      })
      editorRef.current!.send({type: 'insert.text', text: 'Q'})
      await vi.waitFor(() =>
        expect({
          c: highlighted('c'),
          cTick: tickOf('c'),
          d: highlighted('d'),
          dTick: tickOf('d'),
        }).toEqual({c: 'bQar', cTick: '0', d: 'two', dTick: '0'}),
      )

      await result.rerender(
        <App value={value} editorRef={editorRef} tick={1} strict={strict} />,
      )
      await expect
        .element(page.getByTestId('host-tick'))
        .toHaveAttribute('data-tick', '1')
      expect({cTick: tickOf('c'), dTick: tickOf('d')}).toEqual({
        cTick: '0',
        dTick: '0',
      })

      commentState.comments = [
        {...original, reactions: [{shortName: ':+1:'}]},
        commentState.comments[1],
      ]
      await result.rerender(
        <App value={value} editorRef={editorRef} tick={2} strict={strict} />,
      )
      await expect
        .element(page.getByTestId('host-tick'))
        .toHaveAttribute('data-tick', '2')
      await vi.waitFor(() =>
        expect({
          c: highlighted('c'),
          cTick: tickOf('c'),
          d: highlighted('d'),
          dTick: tickOf('d'),
        }).toEqual({c: 'bQar', cTick: '0', d: 'two', dTick: '0'}),
      )

      editorRef.current!.send({
        type: 'select',
        at: {
          anchor: {path: fx.spanPath, offset: 4},
          focus: {path: fx.spanPath, offset: 8},
        },
      })
      editorRef.current!.send({type: 'delete', direction: 'forward'})
      await vi.waitFor(() =>
        expect({
          c: highlighted('c'),
          d: highlighted('d'),
          dTick: tickOf('d'),
          text: document.querySelector('[data-testid="editable"]')?.textContent,
        }).toEqual({
          c: null,
          d: 'two',
          dTick: '0',
          text: 'foo  bazone two three',
        }),
      )

      await result.rerender(
        <App value={value} editorRef={editorRef} tick={3} strict={strict} />,
      )
      await expect
        .element(page.getByTestId('host-tick'))
        .toHaveAttribute('data-tick', '3')
      editorRef.current!.send({
        type: 'select',
        at: {
          anchor: {path: fx.spanPath, offset: 4},
          focus: {path: fx.spanPath, offset: 4},
        },
      })
      editorRef.current!.send({type: 'insert.text', text: 'bar'})
      await vi.waitFor(() =>
        expect({
          c: highlighted('c'),
          d: highlighted('d'),
          dTick: tickOf('d'),
          text: document.querySelector('[data-testid="editable"]')?.textContent,
        }).toEqual({
          c: null,
          d: 'two',
          dTick: '0',
          text: 'foo bar bazone two three',
        }),
      )

      commentState.comments = [
        ...commentState.comments,
        reply(keyGenerator(), 'c', fx.fieldPath),
      ]
      await result.rerender(
        <App value={value} editorRef={editorRef} tick={4} strict={strict} />,
      )
      await vi.waitFor(() =>
        expect({
          c: highlighted('c'),
          cStart: highlightStart('c'),
          cTick: tickOf('c'),
          d: highlighted('d'),
          dTick: tickOf('d'),
        }).toEqual({c: 'bar', cStart: 4, cTick: '4', d: 'two', dTick: '0'}),
      )
    },
  )

  test('Scenario: a highlight drawn in the same commit as a new renderer uses the new renderer', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentState.comments = []
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()

    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={2} />)

    await vi.waitFor(() =>
      expect({
        highlighted: highlighted('c'),
        start: highlightStart('c'),
        tick: document
          .querySelector('[data-testid="comment-c"]')
          ?.getAttribute('data-tick'),
      }).toEqual({highlighted: 'bar', start: 4, tick: '2'}),
    )
  })

  test('Scenario: an inline renderDecoration keeps drawn highlights as they are across app re-renders', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    highlightRenderCounts.clear()
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.twoBlocks('foo bar baz', 'other')
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} inlineRenderer />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    const before = document.querySelector('[data-testid="comment-c"]')!

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: fx.secondSpanPath, offset: 0},
        focus: {path: fx.secondSpanPath, offset: 0},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'X'})
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-testid="editable"]')?.textContent,
      ).toEqual('foo bar bazXother'),
    )
    for (const tick of [1, 2, 3]) {
      await result.rerender(
        <App value={value} editorRef={editorRef} tick={tick} inlineRenderer />,
      )
      await expect
        .element(page.getByTestId('host-tick'))
        .toHaveAttribute('data-tick', String(tick))
    }
    expect({
      highlightRenders: highlightRenderCounts.get('c'),
      highlighted: highlighted('c'),
      same: document.querySelector('[data-testid="comment-c"]') === before,
      tick: before.getAttribute('data-tick'),
    }).toEqual({
      highlightRenders: 1,
      highlighted: 'bar',
      same: true,
      tick: '0',
    })
  })

  test('Scenario: typing before many comments does not re-render other highlights, with node identity as a guard', async () => {
    const fx = createFixture(layout)
    const editorRef = createRef<Editor>()
    commentRenderCounts.clear()
    highlightRenderCounts.clear()
    commentState.comments = Array.from({length: 20}, (_, index) =>
      comment(
        `c${index}`,
        fx.fieldPath,
        fx.many[index]!.key,
        `foo ${open}bar${close} baz`,
      ),
    )
    await render(
      <App value={fx.manyBlocks(20)} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c19')).toEqual('bar'))
    const before = document.querySelector(
      '[data-testid="comment-c19"] [data-pt-text]',
    )!.firstChild!
    const renderCountBefore = commentRenderCounts.get('c19')
    const highlightRendersBefore = highlightRenderCounts.get('c19')

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            ...fx.prefix,
            {_key: fx.many[0]!.key},
            'children',
            {_key: fx.many[0]!.span},
          ],
          offset: 0,
        },
        focus: {
          path: [
            ...fx.prefix,
            {_key: fx.many[0]!.key},
            'children',
            {_key: fx.many[0]!.span},
          ],
          offset: 0,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'X'})

    await vi.waitFor(() => {
      const after = document.querySelector(
        '[data-testid="comment-c19"] [data-pt-text]',
      )!.firstChild!
      expect({
        connected: before.isConnected,
        highlightRenders: highlightRenderCounts.get('c19'),
        renderCount: commentRenderCounts.get('c19'),
        same: before === after,
        text: document.querySelector('[data-testid="editable"]')?.textContent,
      }).toEqual({
        connected: true,
        highlightRenders: highlightRendersBefore,
        renderCount: renderCountBefore,
        same: true,
        text: `X${'foo bar baz'.repeat(20)}`,
      })
    })
  })
})

describe('SDKCommentsPlugin', () => {
  test('Scenario: mounting the plugin draws a highlight', async () => {
    const fx = createFixture(layouts[0]!)
    commentState.comments = [
      comment('c', fx.fieldPath, fx.first.key, `foo ${open}bar${close} baz`),
    ]
    const value = fx.wrap(
      fx.textBlock(fx.first, 'foo bar baz'),
    ) as Array<PortableTextBlock>
    await render(
      <EditorProvider initialConfig={{schemaDefinition, initialValue: value}}>
        <PortableTextEditable data-testid="editable" />
        <Suspense fallback={null}>
          <SDKCommentsPlugin
            documentId="doc"
            documentType="article"
            path="content"
            renderDecoration={(commentValue) => (props) => (
              <span
                data-testid={`comment-${(commentValue as {id: string}).id}`}
              >
                {props.children}
              </span>
            )}
          />
        </Suspense>
      </EditorProvider>,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })
})
