import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import {applyInsertNodeAtPath} from '../internal-utils/apply-insert-node'
import {applyMergeNode} from '../internal-utils/apply-merge-node'
import {applySetNode} from '../internal-utils/apply-set-node'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debug} from '../internal-utils/debug'
import {isEqualMarkDefs} from '../internal-utils/equality'
import {getChildren} from '../node-traversal/get-children'
import {getParent} from '../node-traversal/get-parent'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {insertNodes} from '../slate/core/insert-nodes'
import {removeNodes} from '../slate/core/remove-nodes'
import {isEditor} from '../slate/editor/is-editor'
import type {Editor} from '../slate/interfaces/editor'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {parentPath} from '../slate/path/parent-path'
import {textEquals} from '../slate/text/text-equals'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {withNormalizeNode} from './slate-plugin.normalize-node'
import {withoutPatching} from './slate-plugin.without-patching'

export function setupNormalizeNode(
  editor: PortableTextSlateEditor,
  editorActor: EditorActor,
) {
  const defaultStyle = editorActor
    .getSnapshot()
    .context.schema.styles.at(0)?.name

  editor.normalizeNode = (entry) => {
    const [node, path] = entry

    // --- Unique keys: check for duplicate keys among siblings (from uniqueKeys plugin) ---
    {
      const parent = getParent(editor, path)
      const siblings = parent
        ? getChildren(editor, parent.path)
        : editor.children.map((child, index) => ({
            node: child,
            path: [index],
          }))

      const siblingKeys = new Set<string>()

      for (const sibling of siblings) {
        if (sibling.node._key && siblingKeys.has(sibling.node._key)) {
          const _key = editorActor.getSnapshot().context.keyGenerator()

          siblingKeys.add(_key)

          withNormalizeNode(editor, () => {
            applySetNode(editor, {_key}, path)
          })

          return
        }

        if (!sibling.node._key) {
          const _key = editorActor.getSnapshot().context.keyGenerator()

          siblingKeys.add(_key)

          withNormalizeNode(editor, () => {
            applySetNode(editor, {_key}, path)
          })

          return
        }

        siblingKeys.add(sibling.node._key)
      }
    }

    // --- Schema: missing _type and _key (from schema plugin) ---
    if (!isEditor(node)) {
      if (node._type === undefined && path.length === 2) {
        debug.normalization('Setting span type on text node without a type')
        const span = node as PortableTextSpan
        const key =
          span._key || editorActor.getSnapshot().context.keyGenerator()
        withNormalizeNode(editor, () => {
          applySetNode(
            editor,
            {
              ...span,
              _type: editorActor.getSnapshot().context.schema.span.name,
              _key: key,
            },
            path,
          )
        })
        return
      }

      if (node._key === undefined && (path.length === 1 || path.length === 2)) {
        debug.normalization('Setting missing key on child node without a key')
        const key = editorActor.getSnapshot().context.keyGenerator()
        withNormalizeNode(editor, () => {
          applySetNode(editor, {_key: key}, path)
        })
        return
      }
    }

    // --- Normalization: empty editor placeholder (from normalization plugin) ---
    if (isEditor(node) && node.children.length === 0) {
      withoutPatching(editor, () => {
        withNormalizeNode(editor, () => {
          applyInsertNodeAtPath(
            editor,
            createPlaceholderBlock(editorActor.getSnapshot().context),
            [0],
          )
        })
      })
    }

    // --- Normalization: merge spans with same marks (from normalization plugin) ---
    if (isTextBlock({schema: editor.schema}, node)) {
      const children = getChildren(editor, path)

      for (const {node: child, path: childPath} of children) {
        const childIndex = childPath[childPath.length - 1]!
        const nextNode = node.children[childIndex + 1]

        if (
          isSpan({schema: editor.schema}, child) &&
          isSpan({schema: editor.schema}, nextNode) &&
          child.marks?.every((mark) => nextNode.marks?.includes(mark)) &&
          nextNode.marks?.every((mark) => child.marks?.includes(mark))
        ) {
          debug.normalization('merging spans with same marks')
          withNormalizeNode(editor, () => {
            const mergePath = [childPath[0]!, childPath[1]! + 1]
            applyMergeNode(editor, mergePath, child.text.length)
          })
          return
        }
      }
    }

    // --- Normalization: add missing .markDefs (from normalization plugin) ---
    if (
      isTextBlock({schema: editor.schema}, node) &&
      !Array.isArray(node.markDefs)
    ) {
      debug.normalization('adding .markDefs to block node')
      withNormalizeNode(editor, () => {
        applySetNode(editor, {markDefs: []}, path)
      })
      return
    }

    // --- Normalization: add missing .style (from normalization plugin) ---
    if (
      defaultStyle &&
      isTextBlock({schema: editor.schema}, node) &&
      typeof node.style === 'undefined'
    ) {
      debug.normalization('adding .style to block node')

      withNormalizeNode(editor, () => {
        applySetNode(editor, {style: defaultStyle}, path)
      })
      return
    }

    // --- Normalization: add missing .marks to spans (from normalization plugin) ---
    if (isSpan({schema: editor.schema}, node) && !Array.isArray(node.marks)) {
      debug.normalization('Adding .marks to span node')
      withNormalizeNode(editor, () => {
        applySetNode(editor, {marks: []}, path)
      })
      return
    }

    // --- Normalization: remove annotations from empty spans (from normalization plugin) ---
    if (isSpan({schema: editor.schema}, node)) {
      const blockPath = parentPath(path)
      const blockEntry = getTextBlockNode(editor, blockPath)
      if (!blockEntry) {
        return
      }
      const decorators = editorActor
        .getSnapshot()
        .context.schema.decorators.map((decorator) => decorator.name)
      const annotations = node.marks?.filter(
        (mark) => !decorators.includes(mark),
      )

      if (node.text === '' && annotations && annotations.length > 0) {
        debug.normalization('removing annotations from empty span node')
        withNormalizeNode(editor, () => {
          applySetNode(
            editor,
            {
              marks: node.marks?.filter((mark) => decorators.includes(mark)),
            },
            path,
          )
        })
        return
      }
    }

    // --- Normalization: remove orphaned annotations from child spans (from normalization plugin) ---
    if (isTextBlock({schema: editor.schema}, node)) {
      const decorators = editorActor
        .getSnapshot()
        .context.schema.decorators.map((decorator) => decorator.name)

      for (const {node: child, path: childPath} of getChildren(editor, path)) {
        if (isSpan({schema: editor.schema}, child)) {
          const marks = child.marks ?? []
          const orphanedAnnotations = marks.filter((mark) => {
            return (
              !decorators.includes(mark) &&
              !node.markDefs?.find((def) => def._key === mark)
            )
          })

          if (orphanedAnnotations.length > 0) {
            debug.normalization('removing orphaned annotations from span node')
            withNormalizeNode(editor, () => {
              applySetNode(
                editor,
                {
                  marks: marks.filter(
                    (mark) => !orphanedAnnotations.includes(mark),
                  ),
                },
                childPath,
              )
            })
            return
          }
        }
      }
    }

    // --- Normalization: remove orphaned annotations from span nodes (from normalization plugin) ---
    if (isSpan({schema: editor.schema}, node)) {
      const blockPath = parentPath(path)
      const blockEntry2 = getTextBlockNode(editor, blockPath)

      if (blockEntry2) {
        const block = blockEntry2.node
        const decorators = editorActor
          .getSnapshot()
          .context.schema.decorators.map((decorator) => decorator.name)
        const marks = node.marks ?? []
        const orphanedAnnotations = marks.filter((mark) => {
          return (
            !decorators.includes(mark) &&
            !block.markDefs?.find((def) => def._key === mark)
          )
        })

        if (orphanedAnnotations.length > 0) {
          debug.normalization('removing orphaned annotations from span node')
          withNormalizeNode(editor, () => {
            applySetNode(
              editor,
              {
                marks: marks.filter(
                  (mark) => !orphanedAnnotations.includes(mark),
                ),
              },
              path,
            )
          })
          return
        }
      }
    }

    // --- Normalization: remove duplicate markDefs (from normalization plugin) ---
    if (isTextBlock({schema: editor.schema}, node)) {
      const markDefs = node.markDefs ?? []
      const markDefKeys = new Set<string>()
      const newMarkDefs: Array<PortableTextObject> = []

      for (const markDef of markDefs) {
        if (!markDefKeys.has(markDef._key)) {
          markDefKeys.add(markDef._key)
          newMarkDefs.push(markDef)
        }
      }

      if (markDefs.length !== newMarkDefs.length) {
        debug.normalization('removing duplicate markDefs')
        withNormalizeNode(editor, () => {
          applySetNode(editor, {markDefs: newMarkDefs}, path)
        })
        return
      }
    }

    // --- Normalization: check consistency of markDefs (from normalization plugin) ---
    if (isTextBlock({schema: editor.schema}, node)) {
      const newMarkDefs = (node.markDefs || []).filter((def) => {
        return node.children.find((child) => {
          return (
            isSpan({schema: editor.schema}, child) &&
            Array.isArray(child.marks) &&
            child.marks.includes(def._key)
          )
        })
      })

      if (node.markDefs && !isEqualMarkDefs(newMarkDefs, node.markDefs)) {
        debug.normalization('removing markDef not in use')
        withNormalizeNode(editor, () => {
          applySetNode(
            editor,
            {
              markDefs: newMarkDefs,
            },
            path,
          )
        })
        return
      }
    }

    // --- Core normalizeNode (from slate/core/normalize-node.ts) ---
    withNormalizeNode(editor, () => {
      coreNormalizeNode(editor, entry)
    })
  }
}

function coreNormalizeNode(
  editor: PortableTextSlateEditor,
  entry: [Editor | Node, Path],
) {
  const [node, path] = entry

  if (isSpan({schema: editor.schema}, node)) {
    return
  }

  if (isObjectNode({schema: editor.schema}, node)) {
    return
  }

  ;(node as any).children ??= []

  let element = node as any

  if (element !== editor && element.children.length === 0) {
    const child = editor.createSpan()
    insertNodes(editor, [child], {at: path.concat(0), includeObjectNodes: true})
    const refetched = getTextBlockNode(editor, path)?.node
    if (!refetched) {
      return
    }
    element = refetched
  }

  const firstChild = element.children[0]!
  const shouldHaveInlines =
    !isEditor(element) &&
    (editor.isInline(element) ||
      isSpan({schema: editor.schema}, firstChild) ||
      isObjectNode({schema: editor.schema}, firstChild) ||
      (isTextBlock({schema: editor.schema}, firstChild) &&
        editor.isInline(firstChild)))

  if (shouldHaveInlines) {
    for (let n = 0; n < element.children.length; n++) {
      const child = element.children[n]
      const prev: Node | undefined = element.children[n - 1]

      if (isSpan({schema: editor.schema}, child)) {
        if (prev != null && isSpan({schema: editor.schema}, prev)) {
          if (child.text === '') {
            removeNodes(editor, {
              at: path.concat(n),
              includeObjectNodes: true,
            })
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (prev.text === '') {
            removeNodes(editor, {
              at: path.concat(n - 1),
              includeObjectNodes: true,
            })
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (textEquals(child, prev, {loose: true})) {
            const mergePath = path.concat(n)
            applyMergeNode(editor, mergePath, prev.text.length)
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          }
        }
      } else if (isTextBlock({schema: editor.schema}, child)) {
        if (editor.isInline(child)) {
          if (prev == null || !isSpan({schema: editor.schema}, prev)) {
            const newChild = editor.createSpan()
            insertNodes(editor, [newChild], {
              at: path.concat(n),
              includeObjectNodes: true,
            })
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n++
          }
          if (n === element.children.length - 1) {
            const newChild = editor.createSpan()
            insertNodes(editor, [newChild], {
              at: path.concat(n + 1),
              includeObjectNodes: true,
            })
            const refetched = getTextBlockNode(editor, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n++
          }
        } else {
          removeNodes(editor, {at: path.concat(n), includeObjectNodes: true})
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n--
        }
      } else if (isObjectNode({schema: editor.schema}, child)) {
        if (prev == null || !isSpan({schema: editor.schema}, prev)) {
          const newChild = editor.createSpan()
          insertNodes(editor, [newChild], {
            at: path.concat(n),
            includeObjectNodes: true,
          })
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
        if (n === element.children.length - 1) {
          const newChild = editor.createSpan()
          insertNodes(editor, [newChild], {
            at: path.concat(n + 1),
            includeObjectNodes: true,
          })
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
      }
    }
  } else {
    for (let n = 0; n < element.children.length; n++) {
      const child = element.children[n]

      if (
        isSpan({schema: editor.schema}, child) ||
        (isTextBlock({schema: editor.schema}, child) && editor.isInline(child))
      ) {
        removeNodes(editor, {at: path.concat(n), includeObjectNodes: true})
        if (path.length === 0) {
          element = editor
        } else {
          const refetched = getTextBlockNode(editor, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
        }
        n--
      }
    }
  }
}
