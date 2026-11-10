import {
  defineContainer,
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
} from '@portabletext/editor'
import {EditorRefPlugin, NodePlugin} from '@portabletext/editor/plugins'
import type {PortableTextBlock} from '@portabletext/schema'
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

const {useSDKCommentDecorations} = await import('./plugin.sdk-comments')

describe('comment highlights root', () => {
  test('Scenario: retyping a deleted comment and adding a reply draws it at its current offset', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'hello '})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 10},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 10},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', 'content'),
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 9},
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', 'content'),
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k2', `one ${open}two${close} three`),
    ]
    const value = [
      textBlock('k0', 'k1', 'foo bar baz'),
      textBlock('k2', 'k3', 'one two three'),
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
    editorRef.current!.send({
      type: 'move.block up',
      at: [{_key: 'k2'}],
    } as never)
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', 'content'),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
  })

  test.each([false, true])(
    'Scenario: a moved-away highlight that is drawn again uses the current renderer in StrictMode %s',
    async (strict) => {
      const editorRef = createRef<Editor>()
      commentState.comments = [
        comment('c', 'content', 'k2', `one ${open}two${close} three`),
      ]
      const value = [
        textBlock('k0', 'k1', 'foo bar baz'),
        textBlock('k2', 'k3', 'one two three'),
      ]
      const result = await render(
        <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
      )
      await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
      editorRef.current!.send({
        type: 'move.block up',
        at: [{_key: 'k2'}],
      } as never)
      await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
      commentState.comments = [
        ...commentState.comments,
        reply('r', 'c', 'content'),
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
      const editorRef = createRef<Editor>()
      commentState.comments = [
        comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
      ]
      commentState.unstable = true
      try {
        const value = [textBlock('k0', 'k1', 'foo bar baz')]
        await render(
          <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
        )
        await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
        editorRef.current!.send({
          type: 'select',
          at: {
            anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
            focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
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

  test('Scenario: rendering receives the comment object returned by the SDK', async () => {
    const editorRef = createRef<Editor>()
    const sdkComment = {
      ...comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
      state: {error: new Error('comment failed')},
    }
    commentState.comments = [sdkComment]
    renderedComments.length = 0
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    await render(<App value={value} editorRef={editorRef} tick={0} />)

    await vi.waitFor(() => expect(renderedComments.at(-1)).toBe(sdkComment))
  })

  test('Scenario: a drawn anchor keeps the position tracked by the decoration layer', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', [
        {_key: 'k0', text: `foo ${open}bar${close} baz`},
        {_key: 'k0', text: `foo bar ${open}baz${close}`},
      ]),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('m', 'content', [
        {_key: 'k0', text: `foo ${open}bar baz${close}`},
        {_key: 'k2', text: `${open}one two${close} three`},
      ]),
    ]
    await render(
      <App
        value={[
          textBlock('k0', 'k1', 'foo bar baz'),
          textBlock('k2', 'k3', 'one two three'),
        ]}
        editorRef={editorRef}
        tick={0}
      />,
    )

    await vi.waitFor(() => expect(highlighted('m')).toEqual('bar bazone two'))
  })

  test('Scenario: a comment whose text can no longer be found is hidden', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('a', 'content', 'k0', `foo ${open}bar${close} baz`),
      comment('b', 'content', 'k2', `one ${open}two${close} three`),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('a')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 11},
      },
    })
    editorRef.current!.send({
      type: 'insert.text',
      text: ' and something else entirely',
    })
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      },
    })
    editorRef.current!.send({
      type: 'insert.text',
      text: 'completely different words ',
    })
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 28},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 28},
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
      block: textBlock('k2', 'k3', 'one two three'),
      placement: 'after',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 62},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 62},
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
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
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 13},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 13},
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

  test('Scenario: comments that load after the value still resolve against the text', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = []
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()

    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })

  test('Scenario: value that arrives after the comments still resolves', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    await render(<App value={undefined} editorRef={editorRef} tick={0} />)
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()
    editorRef.current!.send({
      type: 'update value',
      value: [textBlock('k0', 'k1', 'foo bar baz')],
    })
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })

  test('Scenario: a changed comment list keeps other highlighted text nodes mounted', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
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
        fieldPath: 'content',
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    await render(<App value={value} editorRef={editorRef} tick={0} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
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
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
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

  test('Scenario: a highlight drawn in the same commit as a new renderer uses the new renderer', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = []
    const value = [textBlock('k0', 'k1', 'foo bar baz')]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()

    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
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
    const editorRef = createRef<Editor>()
    highlightRenderCounts.clear()
    commentState.comments = [
      comment('c', 'content', 'k0', `foo ${open}bar${close} baz`),
    ]
    const value = [
      textBlock('k0', 'k1', 'foo bar baz'),
      textBlock('k2', 'k3', 'other'),
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} inlineRenderer />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    const before = document.querySelector('[data-testid="comment-c"]')!

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
        focus: {path: [{_key: 'k2'}, 'children', {_key: 'k3'}], offset: 0},
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
})

describe('comment highlights callout in callout', () => {
  test('Scenario: retyping a deleted comment and adding a reply draws it at its current offset', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 4,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 7,
        },
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'hello '})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 10,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 10,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', 'content[_key=="k44"].content[_key=="k45"].content'),
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 9,
        },
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', 'content[_key=="k44"].content[_key=="k45"].content'),
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k2',
        `one ${open}two${close} three`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [
              textBlock('k0', 'k1', 'foo bar baz'),
              textBlock('k2', 'k3', 'one two three'),
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
    editorRef.current!.send({
      type: 'move.block up',
      at: [{_key: 'k44'}, 'content', {_key: 'k45'}, 'content', {_key: 'k2'}],
    } as never)
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    commentState.comments = [
      ...commentState.comments,
      reply('r', 'c', 'content[_key=="k44"].content[_key=="k45"].content'),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
  })

  test.each([false, true])(
    'Scenario: a moved-away highlight that is drawn again uses the current renderer in StrictMode %s',
    async (strict) => {
      const editorRef = createRef<Editor>()
      commentState.comments = [
        comment(
          'c',
          'content[_key=="k44"].content[_key=="k45"].content',
          'k2',
          `one ${open}two${close} three`,
        ),
      ]
      const value = [
        {
          _type: 'callout',
          _key: 'k44',
          content: [
            {
              _type: 'callout',
              _key: 'k45',
              content: [
                textBlock('k0', 'k1', 'foo bar baz'),
                textBlock('k2', 'k3', 'one two three'),
              ],
            },
          ],
        },
      ]
      const result = await render(
        <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
      )
      await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
      editorRef.current!.send({
        type: 'move.block up',
        at: [{_key: 'k44'}, 'content', {_key: 'k45'}, 'content', {_key: 'k2'}],
      } as never)
      await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
      commentState.comments = [
        ...commentState.comments,
        reply('r', 'c', 'content[_key=="k44"].content[_key=="k45"].content'),
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
      const editorRef = createRef<Editor>()
      commentState.comments = [
        comment(
          'c',
          'content[_key=="k44"].content[_key=="k45"].content',
          'k0',
          `foo ${open}bar${close} baz`,
        ),
      ]
      commentState.unstable = true
      try {
        const value = [
          {
            _type: 'callout',
            _key: 'k44',
            content: [
              {
                _type: 'callout',
                _key: 'k45',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ]
        await render(
          <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
        )
        await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
        editorRef.current!.send({
          type: 'select',
          at: {
            anchor: {
              path: [
                {_key: 'k44'},
                'content',
                {_key: 'k45'},
                'content',
                {_key: 'k0'},
                'children',
                {_key: 'k1'},
              ],
              offset: 0,
            },
            focus: {
              path: [
                {_key: 'k44'},
                'content',
                {_key: 'k45'},
                'content',
                {_key: 'k0'},
                'children',
                {_key: 'k1'},
              ],
              offset: 0,
            },
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

  test('Scenario: a drawn anchor keeps the position tracked by the decoration layer', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('c', 'content[_key=="k44"].content[_key=="k45"].content', [
        {_key: 'k0', text: `foo ${open}bar${close} baz`},
        {_key: 'k0', text: `foo bar ${open}baz${close}`},
      ]),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment('m', 'content[_key=="k44"].content[_key=="k45"].content', [
        {_key: 'k0', text: `foo ${open}bar baz${close}`},
        {_key: 'k2', text: `${open}one two${close} three`},
      ]),
    ]
    await render(
      <App
        value={[
          {
            _type: 'callout',
            _key: 'k44',
            content: [
              {
                _type: 'callout',
                _key: 'k45',
                content: [
                  textBlock('k0', 'k1', 'foo bar baz'),
                  textBlock('k2', 'k3', 'one two three'),
                ],
              },
            ],
          },
        ]}
        editorRef={editorRef}
        tick={0}
      />,
    )

    await vi.waitFor(() => expect(highlighted('m')).toEqual('bar bazone two'))
  })

  test('Scenario: a comment whose text can no longer be found is hidden', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'a',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
      comment(
        'b',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k2',
        `one ${open}two${close} three`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('a')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 7,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 11,
        },
      },
    })
    editorRef.current!.send({
      type: 'insert.text',
      text: ' and something else entirely',
    })
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 4,
        },
      },
    })
    editorRef.current!.send({
      type: 'insert.text',
      text: 'completely different words ',
    })
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 28,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 28,
        },
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
      block: textBlock('k2', 'k3', 'one two three'),
      placement: 'after',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 62,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 62,
        },
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
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
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 13,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 13,
        },
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

  test('Scenario: comments that load after the value still resolve against the text', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = []
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()

    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })

  test('Scenario: value that arrives after the comments still resolves', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    await render(<App value={undefined} editorRef={editorRef} tick={0} />)
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()
    editorRef.current!.send({
      type: 'update value',
      value: [
        {
          _type: 'callout',
          _key: 'k44',
          content: [
            {
              _type: 'callout',
              _key: 'k45',
              content: [textBlock('k0', 'k1', 'foo bar baz')],
            },
          ],
        },
      ],
    })
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })

  test('Scenario: a changed comment list keeps other highlighted text nodes mounted', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
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
        fieldPath: 'content[_key=="k44"].content[_key=="k45"].content',
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
    await render(<App value={value} editorRef={editorRef} tick={0} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 5,
        },
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
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
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 5,
        },
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

  test('Scenario: a highlight drawn in the same commit as a new renderer uses the new renderer', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = []
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [textBlock('k0', 'k1', 'foo bar baz')],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()

    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
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
    const editorRef = createRef<Editor>()
    highlightRenderCounts.clear()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k44"].content[_key=="k45"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'callout',
        _key: 'k44',
        content: [
          {
            _type: 'callout',
            _key: 'k45',
            content: [
              textBlock('k0', 'k1', 'foo bar baz'),
              textBlock('k2', 'k3', 'other'),
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} inlineRenderer />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    const before = document.querySelector('[data-testid="comment-c"]')!

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k44'},
            'content',
            {_key: 'k45'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
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
})

describe('comment highlights table cell', () => {
  test('Scenario: retyping a deleted comment and adding a reply draws it at its current offset', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 4,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 7,
        },
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'hello '})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 10,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 10,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    commentState.comments = [
      ...commentState.comments,
      reply(
        'r',
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
      ),
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 9,
        },
      },
    })
    editorRef.current!.send({type: 'delete', direction: 'forward'})
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 6,
        },
      },
    })
    editorRef.current!.send({type: 'insert.text', text: 'bar'})
    commentState.comments = [
      ...commentState.comments,
      reply(
        'r',
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
      ),
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k2',
        `one ${open}two${close} three`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [
                  textBlock('k0', 'k1', 'foo bar baz'),
                  textBlock('k2', 'k3', 'one two three'),
                ],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
    editorRef.current!.send({
      type: 'move.block up',
      at: [
        {_key: 'k46'},
        'rows',
        {_key: 'k47'},
        'cells',
        {_key: 'k48'},
        'content',
        {_key: 'k2'},
      ],
    } as never)
    await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
    commentState.comments = [
      ...commentState.comments,
      reply(
        'r',
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
      ),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
  })

  test.each([false, true])(
    'Scenario: a moved-away highlight that is drawn again uses the current renderer in StrictMode %s',
    async (strict) => {
      const editorRef = createRef<Editor>()
      commentState.comments = [
        comment(
          'c',
          'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
          'k2',
          `one ${open}two${close} three`,
        ),
      ]
      const value = [
        {
          _type: 'table',
          _key: 'k46',
          rows: [
            {
              _type: 'row',
              _key: 'k47',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k48',
                  content: [
                    textBlock('k0', 'k1', 'foo bar baz'),
                    textBlock('k2', 'k3', 'one two three'),
                  ],
                },
              ],
            },
          ],
        },
      ]
      const result = await render(
        <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
      )
      await vi.waitFor(() => expect(highlighted('c')).toEqual('two'))
      editorRef.current!.send({
        type: 'move.block up',
        at: [
          {_key: 'k46'},
          'rows',
          {_key: 'k47'},
          'cells',
          {_key: 'k48'},
          'content',
          {_key: 'k2'},
        ],
      } as never)
      await vi.waitFor(() => expect(highlighted('c')).toEqual(null))
      commentState.comments = [
        ...commentState.comments,
        reply(
          'r',
          'c',
          'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        ),
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
      const editorRef = createRef<Editor>()
      commentState.comments = [
        comment(
          'c',
          'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
          'k0',
          `foo ${open}bar${close} baz`,
        ),
      ]
      commentState.unstable = true
      try {
        const value = [
          {
            _type: 'table',
            _key: 'k46',
            rows: [
              {
                _type: 'row',
                _key: 'k47',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k48',
                    content: [textBlock('k0', 'k1', 'foo bar baz')],
                  },
                ],
              },
            ],
          },
        ]
        await render(
          <App value={value} editorRef={editorRef} tick={0} strict={strict} />,
        )
        await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
        editorRef.current!.send({
          type: 'select',
          at: {
            anchor: {
              path: [
                {_key: 'k46'},
                'rows',
                {_key: 'k47'},
                'cells',
                {_key: 'k48'},
                'content',
                {_key: 'k0'},
                'children',
                {_key: 'k1'},
              ],
              offset: 0,
            },
            focus: {
              path: [
                {_key: 'k46'},
                'rows',
                {_key: 'k47'},
                'cells',
                {_key: 'k48'},
                'content',
                {_key: 'k0'},
                'children',
                {_key: 'k1'},
              ],
              offset: 0,
            },
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

  test('Scenario: a drawn anchor keeps the position tracked by the decoration layer', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        [
          {_key: 'k0', text: `foo ${open}bar${close} baz`},
          {_key: 'k0', text: `foo bar ${open}baz${close}`},
        ],
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'm',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        [
          {_key: 'k0', text: `foo ${open}bar baz${close}`},
          {_key: 'k2', text: `${open}one two${close} three`},
        ],
      ),
    ]
    await render(
      <App
        value={[
          {
            _type: 'table',
            _key: 'k46',
            rows: [
              {
                _type: 'row',
                _key: 'k47',
                cells: [
                  {
                    _type: 'cell',
                    _key: 'k48',
                    content: [
                      textBlock('k0', 'k1', 'foo bar baz'),
                      textBlock('k2', 'k3', 'one two three'),
                    ],
                  },
                ],
              },
            ],
          },
        ]}
        editorRef={editorRef}
        tick={0}
      />,
    )

    await vi.waitFor(() => expect(highlighted('m')).toEqual('bar bazone two'))
  })

  test('Scenario: a comment whose text can no longer be found is hidden', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'a',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
      comment(
        'b',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k2',
        `one ${open}two${close} three`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('a')).toEqual('bar'))

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 7,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 11,
        },
      },
    })
    editorRef.current!.send({
      type: 'insert.text',
      text: ' and something else entirely',
    })
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 4,
        },
      },
    })
    editorRef.current!.send({
      type: 'insert.text',
      text: 'completely different words ',
    })
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 28,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 28,
        },
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
      block: textBlock('k2', 'k3', 'one two three'),
      placement: 'after',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 62,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 62,
        },
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 0,
        },
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
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 13,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 13,
        },
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

  test('Scenario: comments that load after the value still resolve against the text', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = []
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()

    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    await result.rerender(<App value={value} editorRef={editorRef} tick={1} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })

  test('Scenario: value that arrives after the comments still resolves', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    await render(<App value={undefined} editorRef={editorRef} tick={0} />)
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()
    editorRef.current!.send({
      type: 'update value',
      value: [
        {
          _type: 'table',
          _key: 'k46',
          rows: [
            {
              _type: 'row',
              _key: 'k47',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k48',
                  content: [textBlock('k0', 'k1', 'foo bar baz')],
                },
              ],
            },
          ],
        },
      ],
    })
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
  })

  test('Scenario: a changed comment list keeps other highlighted text nodes mounted', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
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
        fieldPath:
          'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
    await render(<App value={value} editorRef={editorRef} tick={0} />)
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 5,
        },
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
    const editorRef = createRef<Editor>()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
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
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
          ],
          offset: 5,
        },
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

  test('Scenario: a highlight drawn in the same commit as a new renderer uses the new renderer', async () => {
    const editorRef = createRef<Editor>()
    commentState.comments = []
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [textBlock('k0', 'k1', 'foo bar baz')],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} />,
    )
    await expect.element(page.getByTestId('editable')).toBeInTheDocument()

    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
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
    const editorRef = createRef<Editor>()
    highlightRenderCounts.clear()
    commentState.comments = [
      comment(
        'c',
        'content[_key=="k46"].rows[_key=="k47"].cells[_key=="k48"].content',
        'k0',
        `foo ${open}bar${close} baz`,
      ),
    ]
    const value = [
      {
        _type: 'table',
        _key: 'k46',
        rows: [
          {
            _type: 'row',
            _key: 'k47',
            cells: [
              {
                _type: 'cell',
                _key: 'k48',
                content: [
                  textBlock('k0', 'k1', 'foo bar baz'),
                  textBlock('k2', 'k3', 'other'),
                ],
              },
            ],
          },
        ],
      },
    ]
    const result = await render(
      <App value={value} editorRef={editorRef} tick={0} inlineRenderer />,
    )
    await vi.waitFor(() => expect(highlighted('c')).toEqual('bar'))
    const before = document.querySelector('[data-testid="comment-c"]')!

    editorRef.current!.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k46'},
            'rows',
            {_key: 'k47'},
            'cells',
            {_key: 'k48'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
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
})

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

function textBlock(key: string, span: string, text: string) {
  return {
    _type: 'block',
    _key: key,
    markDefs: [],
    children: [{_type: 'span', _key: span, text, marks: []}],
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
  const decorations = useSDKCommentDecorations({
    documentId: 'doc',
    documentType: 'article',
    path: 'content',
    renderDecoration,
  })
  return (
    <PortableTextEditable
      data-testid="editable"
      rangeDecorations={decorations}
    />
  )
}

function InlineHighlights(hostProps: {tick: number}) {
  const decorations = useSDKCommentDecorations({
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
  return (
    <PortableTextEditable
      data-testid="editable"
      rangeDecorations={decorations}
    />
  )
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
