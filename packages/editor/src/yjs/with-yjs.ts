import * as Y from 'yjs'
import {Editor, type Node, type Operation} from '../slate'
import {withRemoteChanges} from '../slate-plugins/slate-plugin.remote-changes'
import {pluginWithoutHistory} from '../slate-plugins/slate-plugin.without-history'
import {withoutPatching} from '../slate-plugins/slate-plugin.without-patching'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applyYjsEvents} from './apply-to-slate'
import {applySlateOp} from './apply-to-yjs'
import {slateNodesToInsertDelta, yTextToSlateElement} from './convert'
import type {YjsEditor, YjsEditorConfig} from './types'

interface BufferedOperation {
  op: Operation
  doc: Node[]
}

/**
 * Wraps a `PortableTextSlateEditor` with Yjs collaboration support.
 *
 * **Local flow**: Slate operations are buffered during `apply`. On `onChange`,
 * all buffered ops are flushed to the shared Y.Doc in a single transaction
 * tagged with `localOrigin`.
 *
 * **Remote flow**: The `observeDeep` handler receives Yjs events for changes
 * made by other peers. These are translated to Slate operations and applied
 * wrapped in `withRemoteChanges`, `withoutPatching`, and `pluginWithoutHistory`
 * so they bypass PT patch generation, history, and are correctly flagged as
 * remote.
 */
export function withYjs(
  editor: PortableTextSlateEditor,
  config: YjsEditorConfig,
): PortableTextSlateEditor {
  const yjsEditor = editor as unknown as YjsEditor
  const {sharedRoot, localOrigin} = config

  yjsEditor.sharedRoot = sharedRoot
  yjsEditor.localOrigin = localOrigin
  yjsEditor.isYjsConnected = false

  let bufferedOps: BufferedOperation[] = []
  let isApplyingRemoteChanges = false

  const {apply, onChange} = editor

  function flushBufferedOps() {
    if (bufferedOps.length === 0) {
      return
    }

    const ops = bufferedOps
    bufferedOps = []

    const yDoc = sharedRoot.doc
    if (!yDoc) {
      return
    }

    yDoc.transact(() => {
      for (const {op, doc} of ops) {
        applySlateOp(sharedRoot, {children: doc} as Node, op)
      }
    }, localOrigin)
  }

  function handleYjsObserve(
    events: Y.YEvent<Y.XmlText>[],
    transaction: Y.Transaction,
  ) {
    if (transaction.origin === localOrigin) {
      // Skip events from our own transactions
      return
    }

    if (!yjsEditor.isYjsConnected) {
      return
    }

    // Flush any pending local ops first
    flushBufferedOps()

    isApplyingRemoteChanges = true

    withRemoteChanges(editor, () => {
      Editor.withoutNormalizing(editor, () => {
        withoutPatching(editor, () => {
          pluginWithoutHistory(editor, () => {
            applyYjsEvents(sharedRoot, editor, events as Y.YEvent<Y.XmlText>[])
          })
        })
      })
      editor.normalize()
    })

    isApplyingRemoteChanges = false

    editor.onChange()
  }

  yjsEditor.connect = () => {
    if (yjsEditor.isYjsConnected) {
      return
    }

    yjsEditor.isYjsConnected = true

    // Sync initial state: if Y.Doc has content, apply it to Slate.
    // If Y.Doc is empty, push Slate state to Y.Doc.
    const yDoc = sharedRoot.doc
    const yDelta = sharedRoot.toDelta()

    if (yDelta.length > 0) {
      // Y.Doc has content — apply it to Slate.
      // Set `isApplyingRemoteChanges` so these Slate operations don't get
      // buffered and sent back to the Y.Doc.
      const element = yTextToSlateElement(sharedRoot)
      isApplyingRemoteChanges = true
      withRemoteChanges(editor, () => {
        Editor.withoutNormalizing(editor, () => {
          withoutPatching(editor, () => {
            pluginWithoutHistory(editor, () => {
              // Replace all Slate children with Y.Doc content
              for (let i = editor.children.length - 1; i >= 0; i--) {
                const child = editor.children[i]
                if (child) {
                  editor.apply({
                    type: 'remove_node',
                    path: [i],
                    node: child,
                  })
                }
              }
              for (let i = 0; i < element.children.length; i++) {
                const child = element.children[i]
                if (child) {
                  editor.apply({
                    type: 'insert_node',
                    path: [i],
                    node: child,
                  })
                }
              }
            })
          })
        })
        editor.normalize()
      })
      isApplyingRemoteChanges = false
    } else if (editor.children.length > 0 && yDoc) {
      // Slate has content but Y.Doc is empty — push to Y.Doc
      yDoc.transact(() => {
        const delta = slateNodesToInsertDelta(editor.children)
        sharedRoot.applyDelta(delta)
      }, localOrigin)
    }

    sharedRoot.observeDeep(handleYjsObserve)
  }

  yjsEditor.disconnect = () => {
    if (!yjsEditor.isYjsConnected) {
      return
    }

    flushBufferedOps()
    sharedRoot.unobserveDeep(handleYjsObserve)
    yjsEditor.isYjsConnected = false
  }

  editor.apply = (op: Operation) => {
    if (yjsEditor.isYjsConnected && !isApplyingRemoteChanges) {
      if (op.type !== 'set_selection') {
        // Buffer the operation with a snapshot of current doc state
        bufferedOps.push({op, doc: [...editor.children]})
      }
    }

    apply(op)
  }

  editor.onChange = () => {
    if (yjsEditor.isYjsConnected && !isApplyingRemoteChanges) {
      flushBufferedOps()
    }

    onChange()
  }

  return editor
}
