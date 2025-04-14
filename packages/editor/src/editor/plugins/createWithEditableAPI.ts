import {
  isPortableTextSpan,
  type Path,
  type PortableTextBlock,
  type PortableTextChild,
  type PortableTextObject,
  type PortableTextTextBlock,
} from '@sanity/types'
import {
  Editor,
  Node,
  Range,
  Element as SlateElement,
  Text,
  Transforms,
} from 'slate'
import type {DOMNode} from 'slate-dom'
import {ReactEditor} from 'slate-react'
import {addAnnotationActionImplementation} from '../../behavior-actions/behavior.action.annotation.add'
import {debugWithName} from '../../internal-utils/debug'
import {toSlateRange} from '../../internal-utils/ranges'
import {
  isListItemActive,
  isStyleActive,
  slateRangeToSelection,
} from '../../internal-utils/slate-utils'
import {fromSlateValue, toSlateValue} from '../../internal-utils/values'
import {
  KEY_TO_VALUE_ELEMENT,
  SLATE_TO_PORTABLE_TEXT_RANGE,
} from '../../internal-utils/weakMaps'
import type {
  EditableAPI,
  EditableAPIDeleteOptions,
  EditorSelection,
  PortableTextSlateEditor,
} from '../../types/editor'
import type {EditorActor} from '../editor-machine'
import {isDecoratorActive} from './createWithPortableTextMarkModel'

const debug = debugWithName('API:editable')

export function createEditableAPI(
  editor: PortableTextSlateEditor,
  editorActor: EditorActor,
) {
  const types = editorActor.getSnapshot().context.schema

  const editableApi: EditableAPI = {
    focus: (): void => {
      editorActor.send({
        type: 'focus',
        editor,
      })
    },
    blur: (): void => {
      editorActor.send({
        type: 'blur',
        editor,
      })
    },
    toggleMark: (mark: string): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'decorator.toggle',
          decorator: mark,
        },
        editor,
      })
    },
    toggleList: (listItem: string): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'list item.toggle',
          listItem,
        },
        editor,
      })
    },
    toggleBlockStyle: (style: string): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'style.toggle',
          style,
        },
        editor,
      })
    },
    isMarkActive: (mark: string): boolean => {
      // Try/catch this, as Slate may error because the selection is currently wrong
      // TODO: catch only relevant error from Slate
      try {
        return isDecoratorActive({editor, decorator: mark})
      } catch (err) {
        console.warn(err)
        return false
      }
    },
    marks: (): string[] => {
      return (
        {
          ...(Editor.marks(editor) || {}),
        }.marks || []
      )
    },
    undo: (): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'history.undo',
        },
        editor,
      })
    },
    redo: (): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'history.redo',
        },
        editor,
      })
    },
    select: (selection: EditorSelection): void => {
      const slateSelection = toSlateRange(selection, editor)
      if (slateSelection) {
        Transforms.select(editor, slateSelection)
      } else {
        Transforms.deselect(editor)
      }
      editor.onChange()
    },
    focusBlock: (): PortableTextBlock | undefined => {
      if (editor.selection) {
        const block = Node.descendant(
          editor,
          editor.selection.focus.path.slice(0, 1),
        )
        if (block) {
          return fromSlateValue(
            [block],
            types.block.name,
            KEY_TO_VALUE_ELEMENT.get(editor),
          )[0]
        }
      }
      return undefined
    },
    focusChild: (): PortableTextChild | undefined => {
      if (editor.selection) {
        const block = Node.descendant(
          editor,
          editor.selection.focus.path.slice(0, 1),
        )
        if (block && editor.isTextBlock(block)) {
          const ptBlock = fromSlateValue(
            [block],
            types.block.name,
            KEY_TO_VALUE_ELEMENT.get(editor),
          )[0] as PortableTextTextBlock
          return ptBlock.children[editor.selection.focus.path[1]]
        }
      }
      return undefined
    },
    insertChild: <TSchemaType extends {name: string}>(
      type: TSchemaType,
      value?: {[prop: string]: any},
    ): Path => {
      if (type.name !== types.span.name) {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'insert.inline object',
            inlineObject: {
              name: type.name,
              value,
            },
          },
          editor,
        })

        return editor.selection
          ? (slateRangeToSelection({
              schema: editorActor.getSnapshot().context.schema,
              editor,
              range: editor.selection,
            })?.focus.path ?? [])
          : []
      }

      if (!editor.selection) {
        throw new Error('The editor has no selection')
      }
      const [focusBlock] = Array.from(
        Editor.nodes(editor, {
          at: editor.selection.focus.path.slice(0, 1),
          match: (n) => n._type === types.block.name,
        }),
      )[0] || [undefined]
      if (!focusBlock) {
        throw new Error('No focused text block')
      }
      if (
        type.name !== types.span.name &&
        !types.inlineObjects.some((t) => t.name === type.name)
      ) {
        throw new Error(
          'This type cannot be inserted as a child to a text block',
        )
      }
      const block = toSlateValue(
        [
          {
            _key: editorActor.getSnapshot().context.keyGenerator(),
            _type: types.block.name,
            children: [
              {
                _key: editorActor.getSnapshot().context.keyGenerator(),
                _type: type.name,
                ...(value ? value : {}),
              },
            ],
          },
        ],
        {schemaTypes: editorActor.getSnapshot().context.schema},
      )[0] as unknown as SlateElement
      const child = block.children[0]
      const focusChildPath = editor.selection.focus.path.slice(0, 2)
      const isSpanNode = child._type === types.span.name
      const focusNode = Node.get(editor, focusChildPath)

      // If we are inserting a span, and currently have focus on an inline object,
      // move the selection to the next span (guaranteed by normalizing rules) before inserting it.
      if (isSpanNode && focusNode._type !== types.span.name) {
        debug(
          'Inserting span child next to inline object child, moving selection + 1',
        )
        editor.move({distance: 1, unit: 'character'})
      }

      Transforms.insertNodes(editor, child, {
        select: true,
        at: editor.selection,
      })
      editor.onChange()

      return editor.selection
        ? (slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            range: editor.selection,
          })?.focus.path ?? [])
        : []
    },
    insertBlock: <TSchemaType extends {name: string}>(
      type: TSchemaType,
      value?: {[prop: string]: any},
    ): Path => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.block',
          block: {
            _type: type.name,
            ...(value ? value : {}),
          },
          placement: 'auto',
        },
        editor,
      })

      return editor.selection
        ? (slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            range: editor.selection,
          })?.focus.path ?? [])
        : []
    },
    hasBlockStyle: (style: string): boolean => {
      try {
        return isStyleActive({editor, style})
      } catch {
        // This is fine.
        return false
      }
    },
    hasListStyle: (listItem: string): boolean => {
      try {
        return isListItemActive({editor, listItem})
      } catch {
        // This is fine.
        return false
      }
    },
    isVoid: (element: PortableTextBlock | PortableTextChild) => {
      return ![types.block.name, types.span.name].includes(element._type)
    },
    findByPath: (
      path: Path,
    ): [
      PortableTextBlock | PortableTextChild | undefined,
      Path | undefined,
    ] => {
      const slatePath = toSlateRange(
        {focus: {path, offset: 0}, anchor: {path, offset: 0}},
        editor,
      )
      if (slatePath) {
        const [block, blockPath] = Editor.node(
          editor,
          slatePath.focus.path.slice(0, 1),
        )
        if (block && blockPath && typeof block._key === 'string') {
          if (path.length === 1 && slatePath.focus.path.length === 1) {
            return [
              fromSlateValue([block], types.block.name)[0],
              [{_key: block._key}],
            ]
          }
          const ptBlock = fromSlateValue(
            [block],
            types.block.name,
            KEY_TO_VALUE_ELEMENT.get(editor),
          )[0]
          if (editor.isTextBlock(ptBlock)) {
            const ptChild = ptBlock.children[slatePath.focus.path[1]]
            if (ptChild) {
              return [
                ptChild,
                [{_key: block._key}, 'children', {_key: ptChild._key}],
              ]
            }
          }
        }
      }
      return [undefined, undefined]
    },
    findDOMNode: (
      element: PortableTextBlock | PortableTextChild,
    ): DOMNode | undefined => {
      let node: DOMNode | undefined
      try {
        const [item] = Array.from(
          Editor.nodes(editor, {
            at: [],
            match: (n) => n._key === element._key,
          }) || [],
        )[0] || [undefined]
        node = ReactEditor.toDOMNode(editor, item)
      } catch {
        // Nothing
      }
      return node
    },
    activeAnnotations: (): PortableTextObject[] => {
      if (!editor.selection || editor.selection.focus.path.length < 2) {
        return []
      }
      try {
        const activeAnnotations: PortableTextObject[] = []
        const spans = Editor.nodes(editor, {
          at: editor.selection,
          match: (node) =>
            Text.isText(node) &&
            node.marks !== undefined &&
            Array.isArray(node.marks) &&
            node.marks.length > 0,
        })
        for (const [span, path] of spans) {
          const [block] = Editor.node(editor, path, {depth: 1})
          if (editor.isTextBlock(block)) {
            block.markDefs?.forEach((def) => {
              if (
                Text.isText(span) &&
                span.marks &&
                Array.isArray(span.marks) &&
                span.marks.includes(def._key)
              ) {
                activeAnnotations.push(def)
              }
            })
          }
        }
        return activeAnnotations
      } catch {
        return []
      }
    },
    isAnnotationActive: (
      annotationType: PortableTextObject['_type'],
    ): boolean => {
      return isAnnotationActive({editor, annotation: {name: annotationType}})
    },
    addAnnotation: (type, value) => {
      let paths: ReturnType<EditableAPI['addAnnotation']> = undefined

      Editor.withoutNormalizing(editor, () => {
        paths = addAnnotationActionImplementation({
          context: {
            keyGenerator: editorActor.getSnapshot().context.keyGenerator,
            schema: types,
          },
          action: {
            type: 'annotation.add',
            annotation: {name: type.name, value: value ?? {}},
            editor,
          },
        })
      })
      editor.onChange()

      return paths
    },
    delete: (
      selection: EditorSelection,
      options?: EditableAPIDeleteOptions,
    ): void => {
      if (selection) {
        const range = toSlateRange(selection, editor)
        const hasRange =
          range && range.anchor.path.length > 0 && range.focus.path.length > 0
        if (!hasRange) {
          throw new Error('Invalid range')
        }
        if (range) {
          if (!options?.mode || options?.mode === 'selected') {
            debug(`Deleting content in selection`)
            Transforms.delete(editor, {
              at: range,
              hanging: true,
              voids: true,
            })
            editor.onChange()
            return
          }
          if (options?.mode === 'blocks') {
            debug(`Deleting blocks touched by selection`)
            Transforms.removeNodes(editor, {
              at: range,
              voids: true,
              match: (node) => {
                return (
                  editor.isTextBlock(node) ||
                  (!editor.isTextBlock(node) && SlateElement.isElement(node))
                )
              },
            })
          }
          if (options?.mode === 'children') {
            debug(`Deleting children touched by selection`)
            Transforms.removeNodes(editor, {
              at: range,
              voids: true,
              match: (node) => {
                return (
                  node._type === types.span.name || // Text children
                  (!editor.isTextBlock(node) && SlateElement.isElement(node)) // inline blocks
                )
              },
            })
          }
          // If the editor was emptied, insert a placeholder block
          // directly into the editor's children. We don't want to do this
          // through a Transform (because that would trigger a change event
          // that would insert the placeholder into the actual value
          // which should remain empty)
          if (editor.children.length === 0) {
            editor.children = [editor.pteCreateTextBlock({decorators: []})]
          }
          editor.onChange()
        }
      }
    },
    removeAnnotation: <TSchemaType extends {name: string}>(
      type: TSchemaType,
    ): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'annotation.remove',
          annotation: {name: type.name},
        },
        editor,
      })
    },
    getSelection: (): EditorSelection | null => {
      let ptRange: EditorSelection = null
      if (editor.selection) {
        const existing = SLATE_TO_PORTABLE_TEXT_RANGE.get(editor.selection)
        if (existing) {
          return existing
        }
        ptRange = slateRangeToSelection({
          schema: editorActor.getSnapshot().context.schema,
          editor,
          range: editor.selection,
        })
        SLATE_TO_PORTABLE_TEXT_RANGE.set(editor.selection, ptRange)
      }
      return ptRange
    },
    getValue: () => {
      return fromSlateValue(
        editor.children,
        types.block.name,
        KEY_TO_VALUE_ELEMENT.get(editor),
      )
    },
    isCollapsedSelection: () => {
      return !!editor.selection && Range.isCollapsed(editor.selection)
    },
    isExpandedSelection: () => {
      return !!editor.selection && Range.isExpanded(editor.selection)
    },
    insertBreak: () => {
      editor.insertBreak()
      editor.onChange()
    },
    getFragment: () => {
      return fromSlateValue(editor.getFragment(), types.block.name)
    },
    isSelectionsOverlapping: (
      selectionA: EditorSelection,
      selectionB: EditorSelection,
    ) => {
      // Convert the selections to Slate ranges
      const rangeA = toSlateRange(selectionA, editor)
      const rangeB = toSlateRange(selectionB, editor)

      // Make sure the ranges are valid
      const isValidRanges = Range.isRange(rangeA) && Range.isRange(rangeB)

      // Check if the ranges are overlapping
      const isOverlapping = isValidRanges && Range.includes(rangeA, rangeB)

      return isOverlapping
    },
  }

  return editableApi
}

function isAnnotationActive({
  editor,
  annotation,
}: {
  editor: PortableTextSlateEditor
  annotation: {
    name: string
  }
}) {
  if (!editor.selection || editor.selection.focus.path.length < 2) {
    return false
  }

  try {
    const spans = [
      ...Editor.nodes(editor, {
        at: editor.selection,
        match: (node) => Text.isText(node),
      }),
    ]

    if (spans.length === 0) {
      return false
    }

    if (
      spans.some(
        ([span]) =>
          !isPortableTextSpan(span) || !span.marks || span.marks?.length === 0,
      )
    )
      return false

    const selectionMarkDefs = spans.reduce((accMarkDefs, [, path]) => {
      const [block] = Editor.node(editor, path, {depth: 1})
      if (editor.isTextBlock(block) && block.markDefs) {
        return [...accMarkDefs, ...block.markDefs]
      }
      return accMarkDefs
    }, [] as PortableTextObject[])

    return spans.every(([span]) => {
      if (!isPortableTextSpan(span)) return false

      const spanMarkDefs = span.marks?.map(
        (markKey) =>
          selectionMarkDefs.find((def) => def?._key === markKey)?._type,
      )

      return spanMarkDefs?.includes(annotation.name)
    })
  } catch {
    return false
  }
}
