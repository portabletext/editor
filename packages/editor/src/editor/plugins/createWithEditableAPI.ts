import {
  isPortableTextSpan,
  type Path,
  type PortableTextBlock,
  type PortableTextChild,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@sanity/types'
import {
  Editor,
  Node,
  Range,
  Element as SlateElement,
  Path as SlatePath,
  Text,
  Transforms,
} from 'slate'
import type {DOMNode} from 'slate-dom'
import {ReactEditor} from 'slate-react'
import {isListItemActive} from '../../behavior-actions/behavior.action.list-item'
import {isStyleActive} from '../../behavior-actions/behavior.action.style'
import type {BehaviorActionImplementation} from '../../behavior-actions/behavior.actions'
import {debugWithName} from '../../internal-utils/debug'
import {toPortableTextRange, toSlateRange} from '../../internal-utils/ranges'
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
        type: 'behavior event',
        behaviorEvent: {
          type: 'focus',
        },
        editor,
      })
    },
    blur: (): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'blur',
        },
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

        return (
          toPortableTextRange(
            fromSlateValue(
              editor.children,
              types.block.name,
              KEY_TO_VALUE_ELEMENT.get(editor),
            ),
            editor.selection,
            types,
          )?.focus.path ?? []
        )
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

      return (
        toPortableTextRange(
          fromSlateValue(
            editor.children,
            types.block.name,
            KEY_TO_VALUE_ELEMENT.get(editor),
          ),
          editor.selection,
          types,
        )?.focus.path || []
      )
    },
    insertBlock: <TSchemaType extends {name: string}>(
      type: TSchemaType,
      value?: {[prop: string]: any},
    ): Path => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.block object',
          blockObject: {
            name: type.name,
            value,
          },
          placement: 'auto',
        },
        editor,
      })

      return (
        toPortableTextRange(
          fromSlateValue(
            editor.children,
            types.block.name,
            KEY_TO_VALUE_ELEMENT.get(editor),
          ),
          editor.selection,
          types,
        )?.focus.path ?? []
      )
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
        ptRange = toPortableTextRange(
          fromSlateValue(
            editor.children,
            types.block.name,
            KEY_TO_VALUE_ELEMENT.get(editor),
          ),
          editor.selection,
          types,
        )
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

/**
 * @public
 */
export type AddedAnnotationPaths = {
  /**
   * @deprecated An annotation may be applied to multiple blocks, resulting
   * in multiple `markDef`'s being created. Use `markDefPaths` instead.
   */
  markDefPath: Path
  markDefPaths: Array<Path>
  /**
   * @deprecated Does not return anything meaningful since an annotation
   * can span multiple blocks and spans. If references the span closest
   * to the focus point of the selection.
   */
  spanPath: Path
}

export const addAnnotationActionImplementation: BehaviorActionImplementation<
  'annotation.add',
  AddedAnnotationPaths | undefined
> = ({context, action}) => {
  const editor = action.editor

  if (!editor.selection || Range.isCollapsed(editor.selection)) {
    return
  }

  let paths: AddedAnnotationPaths | undefined = undefined
  let spanPath: Path | undefined
  let markDefPath: Path | undefined
  const markDefPaths: Path[] = []

  const selectedBlocks = Editor.nodes(editor, {
    at: editor.selection,
    match: (node) => editor.isTextBlock(node),
    reverse: Range.isBackward(editor.selection),
  })

  for (const [block, blockPath] of selectedBlocks) {
    if (block.children.length === 0) {
      continue
    }

    if (block.children.length === 1 && block.children[0].text === '') {
      continue
    }

    const annotationKey = context.keyGenerator()
    const markDefs = block.markDefs ?? []
    const existingMarkDef = markDefs.find(
      (markDef) =>
        markDef._type === action.annotation.name &&
        markDef._key === annotationKey,
    )

    if (existingMarkDef === undefined) {
      Transforms.setNodes(
        editor,
        {
          markDefs: [
            ...markDefs,
            {
              _type: action.annotation.name,
              _key: annotationKey,
              ...action.annotation.value,
            },
          ],
        },
        {at: blockPath},
      )

      markDefPath = [{_key: block._key}, 'markDefs', {_key: annotationKey}]

      if (Range.isBackward(editor.selection)) {
        markDefPaths.unshift(markDefPath)
      } else {
        markDefPaths.push(markDefPath)
      }
    }

    Transforms.setNodes(editor, {}, {match: Text.isText, split: true})

    const children = Node.children(editor, blockPath)

    for (const [span, path] of children) {
      if (!editor.isTextSpan(span)) {
        continue
      }

      if (!Range.includes(editor.selection, path)) {
        continue
      }

      const marks = span.marks ?? []
      const existingSameTypeAnnotations = marks.filter((mark) =>
        markDefs.some(
          (markDef) =>
            markDef._key === mark && markDef._type === action.annotation.name,
        ),
      )

      Transforms.setNodes(
        editor,
        {
          marks: [
            ...marks.filter(
              (mark) => !existingSameTypeAnnotations.includes(mark),
            ),
            annotationKey,
          ],
        },
        {at: path},
      )

      spanPath = [{_key: block._key}, 'children', {_key: span._key}]
    }
  }

  if (markDefPath && spanPath) {
    paths = {
      markDefPath,
      markDefPaths,
      spanPath,
    }
  }

  return paths
}

export const removeAnnotationActionImplementation: BehaviorActionImplementation<
  'annotation.remove'
> = ({action}) => {
  const editor = action.editor

  debug('Removing annotation', action.annotation.name)

  if (!editor.selection) {
    return
  }

  if (Range.isCollapsed(editor.selection)) {
    const [block, blockPath] = Editor.node(editor, editor.selection, {
      depth: 1,
    })

    if (!editor.isTextBlock(block)) {
      return
    }

    const markDefs = block.markDefs ?? []
    const potentialAnnotations = markDefs.filter(
      (markDef) => markDef._type === action.annotation.name,
    )

    const [selectedChild, selectedChildPath] = Editor.node(
      editor,
      editor.selection,
      {
        depth: 2,
      },
    )

    if (!editor.isTextSpan(selectedChild)) {
      return
    }

    const annotationToRemove = selectedChild.marks?.find((mark) =>
      potentialAnnotations.some((markDef) => markDef._key === mark),
    )

    if (!annotationToRemove) {
      return
    }

    const previousSpansWithSameAnnotation: Array<
      [span: PortableTextSpan, path: SlatePath]
    > = []

    for (const [child, childPath] of Node.children(editor, blockPath, {
      reverse: true,
    })) {
      if (!editor.isTextSpan(child)) {
        continue
      }

      if (!SlatePath.isBefore(childPath, selectedChildPath)) {
        continue
      }

      if (child.marks?.includes(annotationToRemove)) {
        previousSpansWithSameAnnotation.push([child, childPath])
      } else {
        break
      }
    }

    const nextSpansWithSameAnnotation: Array<
      [span: PortableTextSpan, path: SlatePath]
    > = []

    for (const [child, childPath] of Node.children(editor, blockPath)) {
      if (!editor.isTextSpan(child)) {
        continue
      }

      if (!SlatePath.isAfter(childPath, selectedChildPath)) {
        continue
      }

      if (child.marks?.includes(annotationToRemove)) {
        nextSpansWithSameAnnotation.push([child, childPath])
      } else {
        break
      }
    }

    for (const [child, childPath] of [
      ...previousSpansWithSameAnnotation,
      [selectedChild, selectedChildPath] as const,
      ...nextSpansWithSameAnnotation,
    ]) {
      Transforms.setNodes(
        editor,
        {
          marks: child.marks?.filter((mark) => mark !== annotationToRemove),
        },
        {at: childPath},
      )
    }
  } else {
    Transforms.setNodes(
      editor,
      {},
      {
        match: (node) => editor.isTextSpan(node),
        split: true,
        hanging: true,
      },
    )

    const blocks = Editor.nodes(editor, {
      at: editor.selection,
      match: (node) => editor.isTextBlock(node),
    })

    for (const [block, blockPath] of blocks) {
      const children = Node.children(editor, blockPath)

      for (const [child, childPath] of children) {
        if (!editor.isTextSpan(child)) {
          continue
        }

        if (!Range.includes(editor.selection, childPath)) {
          continue
        }

        const markDefs = block.markDefs ?? []
        const marks = child.marks ?? []
        const marksWithoutAnnotation = marks.filter((mark) => {
          const markDef = markDefs.find((markDef) => markDef._key === mark)
          return markDef?._type !== action.annotation.name
        })

        if (marksWithoutAnnotation.length !== marks.length) {
          Transforms.setNodes(
            editor,
            {
              marks: marksWithoutAnnotation,
            },
            {at: childPath},
          )
        }
      }
    }
  }
}

export const toggleAnnotationActionImplementation: BehaviorActionImplementation<
  'annotation.toggle',
  AddedAnnotationPaths | undefined
> = ({context, action}) => {
  const isActive = isAnnotationActive({
    editor: action.editor,
    annotation: {name: action.annotation.name},
  })

  if (isActive) {
    removeAnnotationActionImplementation({
      context,
      action: {
        type: 'annotation.remove',
        annotation: action.annotation,
        editor: action.editor,
      },
    })
  } else {
    return addAnnotationActionImplementation({
      context,
      action: {
        type: 'annotation.add',
        annotation: action.annotation,
        editor: action.editor,
      },
    })
  }
}
