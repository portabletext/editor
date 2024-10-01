import type {PortableTextBlock} from '@sanity/types'
import {Box, Card, Code, Text} from '@sanity/ui'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {Subject} from 'rxjs'
import {styled} from 'styled-components'
import {
  PortableTextEditable,
  PortableTextEditor,
  usePortableTextEditor,
  type BlockDecoratorRenderProps,
  type BlockListItemRenderProps,
  type BlockRenderProps,
  type BlockStyleRenderProps,
  type EditorChange,
  type EditorSelection,
  type HotkeyOptions,
  type Patch,
  type RenderBlockFunction,
  type RenderChildFunction,
} from '../../../src'
import {schema} from '../../schema'
import {createKeyGenerator} from '../keyGenerator'

export const HOTKEYS: HotkeyOptions = {
  marks: {
    'mod+b': 'strong',
    'mod+i': 'em',
  },
  custom: {
    'mod+-': (e, editor) => {
      e.preventDefault()
      PortableTextEditor.toggleList(editor, 'number')
    },
    'mod+l': (e, editor) => {
      e.preventDefault()
      toggleLink(editor)
    },
    'mod+m': (e, editor) => {
      e.preventDefault()
      toggleComment(editor)
    },
  },
}

export const BlockObject = styled.div<BlockRenderProps>`
  border: ${(props) =>
    props.focused ? '1px solid blue' : '1px solid transparent'};
  background: ${(props) => (props.selected ? '#eeeeff' : 'transparent')};
  padding: 2em;
`

function getRandomColor() {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

const renderPlaceholder = () => 'Type here!'

export const Editor = ({
  value,
  onMutation,
  editorId,
  patches$,
  selection,
}: {
  value: PortableTextBlock[] | undefined
  onMutation: (mutatingPatches: Patch[]) => void
  editorId: string
  patches$: Subject<{
    patches: Patch[]
    snapshot: PortableTextBlock[] | undefined
  }>
  selection: EditorSelection | null
}) => {
  const [selectionValue, setSelectionValue] = useState<EditorSelection | null>(
    selection,
  )
  const selectionString = useMemo(
    () => JSON.stringify(selectionValue),
    [selectionValue],
  )
  const editor = useRef<PortableTextEditor>(null)
  const keyGenFn = useMemo(
    () => createKeyGenerator(editorId.slice(0, 1)),
    [editorId],
  )
  const [isOffline, setIsOffline] = useState(!window.navigator.onLine)
  const [readOnly, setReadOnly] = useState(false)

  const renderBlock: RenderBlockFunction = useCallback((props) => {
    const {value: block, schemaType, children} = props
    if (editor.current) {
      const textType = editor.current.schemaTypes.block
      // Text blocks
      if (schemaType.name === textType.name) {
        return (
          <Box marginBottom={4}>
            <Text style={{color: getRandomColor()}}>{children}</Text>
          </Box>
        )
      }
      // Object blocks
      return (
        <Card marginBottom={4}>
          <BlockObject {...props}>
            <>{JSON.stringify(block)}</>
          </BlockObject>
        </Card>
      )
    }
    return children
  }, [])

  const renderChild: RenderChildFunction = useCallback((props) => {
    const {schemaType, children} = props
    if (editor.current) {
      const textType = editor.current.schemaTypes.span
      // Text spans
      if (schemaType.name === textType.name) {
        return children
      }
      // Inline objects
    }
    return children
  }, [])

  const renderDecorator = useCallback((props: BlockDecoratorRenderProps) => {
    const {value: mark, children} = props
    switch (mark) {
      case 'strong':
        return <strong>{children}</strong>
      case 'em':
        return <em>{children}</em>
      case 'code':
        return <code>{children}</code>
      case 'underline':
        return <u>{children}</u>
      case 'strike-through':
        return <s>{children}</s>
      default:
        return children
    }
  }, [])

  const renderStyle = useCallback((props: BlockStyleRenderProps) => {
    return props.children
  }, [])

  const handleChange = useCallback(
    (change: EditorChange): void => {
      switch (change.type) {
        case 'selection':
          setSelectionValue(change.selection)
          break
        case 'mutation':
          onMutation(change.patches)
          break
        case 'connection':
          if (change.value === 'offline') {
            setIsOffline(true)
          } else if (change.value === 'online') {
            setIsOffline(false)
          }
          break
        case 'blur':
        case 'focus':
        case 'invalidValue':
        case 'loading':
        case 'patch':
        case 'ready':
        case 'unset':
        case 'value':
          break
        default:
          throw new Error(`Unhandled editor change ${JSON.stringify(change)}`)
      }
    },
    [onMutation],
  )

  const renderListItem = useCallback((props: BlockListItemRenderProps) => {
    const {level, schemaType, children} = props
    const listStyleType = schemaType.value === 'number' ? 'decimal' : 'inherit'
    return (
      <li style={{listStyleType, paddingLeft: `${level * 10}pt`}}>
        {children}
      </li>
    )
  }, [])

  const editable = useMemo(
    () => (
      <PortableTextEditable
        renderPlaceholder={renderPlaceholder}
        hotkeys={HOTKEYS}
        renderBlock={renderBlock}
        renderDecorator={renderDecorator}
        renderChild={renderChild}
        renderListItem={renderListItem}
        renderStyle={renderStyle}
        selection={selection}
        style={{outline: 'none'}}
        spellCheck
      />
    ),
    [
      renderBlock,
      renderChild,
      renderDecorator,
      renderListItem,
      renderStyle,
      selection,
    ],
  )

  // Make sure that the test editor is focused and out of "readOnly mode".
  useEffect(() => {
    if (editor.current) {
      PortableTextEditor.focus(editor.current)
    }
  }, [editor])

  const handleToggleReadOnly = useCallback(() => {
    setReadOnly(!readOnly)
  }, [readOnly])

  if (!editorId) {
    return null
  }

  return (
    <PortableTextEditor
      ref={editor}
      schemaType={schema}
      onChange={handleChange}
      patches$={patches$}
      value={value}
      keyGenerator={keyGenFn}
      readOnly={isOffline || readOnly}
    >
      <BlockButtons />
      <InlineObjectButtons />
      <CommentButtons />
      <LinkButtons />
      <Box padding={4} style={{outline: '1px solid #999'}}>
        {editable}
      </Box>
      <Box padding={4} style={{outline: '1px solid #999'}}>
        <Code
          as="code"
          size={0}
          language="json"
          id="pte-selection"
          data-selection={selectionString}
        >
          {selectionString}
        </Code>
      </Box>
      <Box paddingTop={2}>
        <button type="button" onClick={handleToggleReadOnly}>
          Toggle readonly ({JSON.stringify(readOnly)})
        </button>
      </Box>
    </PortableTextEditor>
  )
}

function BlockButtons() {
  const editor = usePortableTextEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-insert-image"
        onClick={() => {
          PortableTextEditor.insertBlock(
            editor,
            {
              jsonType: 'object',
              name: 'image',
              fields: [],
              __experimental_search: [],
            },
            {url: 'http://example.com/image.png'},
          )
          PortableTextEditor.focus(editor)
        }}
      >
        Insert image
      </button>
    </>
  )
}

function InlineObjectButtons() {
  const editor = usePortableTextEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-insert-stock-ticker"
        onClick={() => {
          PortableTextEditor.insertChild(
            editor,
            {
              jsonType: 'object',
              name: 'stock-ticker',
              fields: [],
              __experimental_search: [],
            },
            {symbol: 'NVDA'},
          )
          PortableTextEditor.focus(editor)
        }}
      >
        Insert stock ticker
      </button>
    </>
  )
}

function CommentButtons() {
  const editor = usePortableTextEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-add-comment"
        onClick={() => {
          addComment(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Add comment
      </button>
      <button
        type="button"
        data-testid="button-remove-comment"
        onClick={() => {
          removeComment(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Remove comment
      </button>
      <button
        type="button"
        data-testid="button-toggle-comment"
        onClick={() => {
          toggleComment(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Toggle comment
      </button>
    </>
  )
}

function LinkButtons() {
  const editor = usePortableTextEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-add-link"
        onClick={() => {
          addLink(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Add link
      </button>
      <button
        type="button"
        data-testid="button-remove-link"
        onClick={() => {
          removeLink(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Remove link
      </button>
      <button
        type="button"
        data-testid="button-toggle-link"
        onClick={() => {
          toggleLink(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Toggle link
      </button>
    </>
  )
}

function toggleComment(editor: PortableTextEditor) {
  const active = PortableTextEditor.isAnnotationActive(editor, 'comment')

  if (active) {
    removeComment(editor)
  } else {
    addComment(editor)
  }
}

function addComment(editor: PortableTextEditor) {
  PortableTextEditor.addAnnotation(
    editor,
    {
      jsonType: 'object',
      name: 'comment',
      fields: [],
      __experimental_search: [],
    },
    {text: 'Consider rewriting this'},
  )
}

function removeComment(editor: PortableTextEditor) {
  PortableTextEditor.removeAnnotation(editor, {
    jsonType: 'object',
    name: 'comment',
    fields: [],
    __experimental_search: [],
  })
}

function toggleLink(editor: PortableTextEditor) {
  const active = PortableTextEditor.isAnnotationActive(editor, 'link')

  if (active) {
    removeLink(editor)
  } else {
    addLink(editor)
  }
}

function addLink(editor: PortableTextEditor) {
  PortableTextEditor.addAnnotation(
    editor,
    {
      jsonType: 'object',
      name: 'link',
      fields: [],
      __experimental_search: [],
    },
    {href: 'https://example.com'},
  )
}

function removeLink(editor: PortableTextEditor) {
  PortableTextEditor.removeAnnotation(editor, {
    jsonType: 'object',
    name: 'link',
    fields: [],
    __experimental_search: [],
  })
}
