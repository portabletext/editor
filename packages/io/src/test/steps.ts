import type {PortableTextBlock} from '@portabletext/schema'
import {Given, Then, When} from 'racejar'
import {expect} from 'vitest'
import {comparableTextspec, createsBlock, emptiesField} from '../document'
import type {IoEditorStatus} from '../editor'
import type {BatchReference} from './parameter-types'
import type {EditorName, ServerCopyName, World} from './world'

export type Context = {world: World}

export const stepDefinitions = [
  Given('the document is {textspec}', (context: Context, textspec: string) => {
    context.world.documentIs(textspec)
  }),
  Given('the server has {textspec}', (context: Context, textspec: string) => {
    context.world.serverHas(textspec)
  }),
  Given('the server has {copy}', (context: Context, copy: ServerCopyName) => {
    context.world.serverHasCopy(copy)
  }),
  Given(
    'the server has one empty block {key}',
    (context: Context, key: string) => {
      context.world.serverHasEmptyBlock(key)
    },
  ),
  Given("the server's block has no key", (context: Context) => {
    context.world.removeServerBlockKey()
  }),
  Given('an editor that claims the first load', (context: Context) => {
    context.world.startEditors({claimLoad: true})
  }),
  Given("an editor that doesn't claim the first load", (context: Context) => {
    context.world.startEditors({claimLoad: false})
  }),

  ...userSteps(),

  When(
    "the server receives {editor}'s batch {int}",
    (context: Context, name: EditorName, batchNumber: number) => {
      context.world.receive(name, batchNumber)
    },
  ),
  When(
    'the server receives {batch} and {batch} as one transaction',
    (context: Context, first: BatchReference, second: BatchReference) => {
      context.world.receiveAsOne(first, second)
    },
  ),
  When(
    "the server receives {editor}'s final batch",
    (context: Context, name: EditorName) => {
      context.world.receiveFinal(name)
    },
  ),
  When(
    "the server refuses {editor}'s batch {int}",
    (context: Context, name: EditorName, batchNumber: number) => {
      context.world.refuse(name, batchNumber)
    },
  ),
  When(
    'another field of the document is changed on the server',
    (context: Context) => {
      context.world.changeOtherField()
    },
  ),
  When(
    "{editor} receives {editor}'s batch {int}",
    (
      context: Context,
      receiverName: EditorName,
      senderName: EditorName,
      batchNumber: number,
    ) => {
      context.world.deliverBatch(receiverName, senderName, batchNumber)
    },
  ),
  When(
    "{editor} receives the other field's change",
    (context: Context, name: EditorName) => {
      context.world.deliverNamed(name, 'the other field')
    },
  ),
  When(
    "{editor}'s batch {int} comes back",
    (context: Context, name: EditorName, batchNumber: number) => {
      context.world.deliverBatch(name, name, batchNumber)
    },
  ),
  When('the document is deleted', (context: Context) => {
    context.world.deleteDocument()
  }),
  When(
    'the document is recreated as {textspec}',
    (context: Context, textspec: string) => {
      context.world.recreateDocument(textspec)
    },
  ),
  When(
    '{editor} receives the deletion',
    (context: Context, name: EditorName) => {
      context.world.deliverNamed(name, 'the deletion')
    },
  ),
  When(
    '{editor} receives the recreation',
    (context: Context, name: EditorName) => {
      context.world.deliverNamed(name, 'the recreation')
    },
  ),
  When('the wait for the missing transaction runs out', (context: Context) => {
    context.world.runOutHeldTransactionWait()
  }),

  When(
    "{editor}'s batch {int} is accepted",
    (context: Context, name: EditorName, batchNumber: number) => {
      context.world.accept(name, batchNumber)
    },
  ),
  When(
    "{editor}'s batch {int} is rejected",
    (context: Context, name: EditorName, batchNumber: number) => {
      context.world.reject(name, batchNumber)
    },
  ),
  When('{editor} is resynced', (context: Context, name: EditorName) => {
    context.world.resync(name, {discardUnsent: false})
  }),
  When(
    '{editor} is resynced, discarding unsent changes',
    (context: Context, name: EditorName) => {
      context.world.resync(name, {discardUnsent: true})
    },
  ),
  When('{editor} is loaded', (context: Context, name: EditorName) => {
    context.world.getEditor(name).host.load()
  }),
  When('the claim is released', (context: Context) => {
    context.world.getEditor('Editor A').editor.releaseClaim()
  }),
  When('{editor} becomes read-only', (context: Context, name: EditorName) => {
    context.world.getEditor(name).editor.updateReadOnly(true)
  }),
  When('{editor} is closed', (context: Context, name: EditorName) => {
    context.world.getEditor(name).editor.close()
  }),

  Then(
    '{editor} shows {textspec}',
    (context: Context, name: EditorName, textspec: string) => {
      const {document} = context.world.getEditor(name).editor
      const {actual, expected} = comparableTextspec(
        {value: document.getValue(), selection: document.getSelection()},
        textspec,
      )

      expect(actual).toEqual(expected)
    },
  ),
  Then('the server has {textspec}', (context: Context, textspec: string) => {
    const {actual, expected} = comparableTextspec(
      {value: context.world.getServer().copy().value ?? [], selection: null},
      textspec,
    )

    expect(actual).toEqual(expected)
  }),
  Then('the server has no document', (context: Context) => {
    expect(context.world.getServer().copy()).toEqual({
      value: undefined,
      rev: undefined,
    })
  }),
  Then('the server has no field', (context: Context) => {
    const copy = context.world.getServer().copy()

    expect(copy.value).toEqual(undefined)
    expect(copy.rev).not.toEqual(undefined)
  }),
  Then(
    'every block in {editor} has a unique key',
    (context: Context, name: EditorName) => {
      const value = context.world.getEditor(name).editor.document.getValue()

      expect(duplicateOrMissingKeys(value)).toEqual([])
    },
  ),
  Then('every block on the server has a unique key', (context: Context) => {
    const value = context.world.getServer().copy().value ?? []

    expect(duplicateOrMissingKeys(value)).toEqual([])
  }),
  Then(
    '{editor} has sent batch {int}',
    (context: Context, name: EditorName, batchNumber: number) => {
      const worldEditor = context.world.getEditor(name)

      expect(worldEditor.editor.sentBatches.length).toEqual(batchNumber)
      worldEditor.checkedBatchCount = batchNumber
    },
  ),
  Then(
    '{editor} has sent nothing new',
    (context: Context, name: EditorName) => {
      const worldEditor = context.world.getEditor(name)

      expect(worldEditor.editor.sentBatches.length).toEqual(
        worldEditor.checkedBatchCount,
      )
    },
  ),
  Then(
    '{editor} has sent a final batch',
    (context: Context, name: EditorName) => {
      expect(
        context.world.getEditor(name).editor.sentBatches.at(-1)?.final,
      ).toEqual(true)
    },
  ),
  Then(
    "{editor}'s batch {int} creates the block",
    (context: Context, name: EditorName, batchNumber: number) => {
      expect(
        createsBlock(context.world.getBatch(name, batchNumber).patches),
      ).toEqual(true)
    },
  ),
  Then(
    "{editor}'s batch {int} does not create a block",
    (context: Context, name: EditorName, batchNumber: number) => {
      expect(
        createsBlock(context.world.getBatch(name, batchNumber).patches),
      ).toEqual(false)
    },
  ),
  Then(
    "{editor}'s batch {int} empties the field",
    (context: Context, name: EditorName, batchNumber: number) => {
      expect(
        emptiesField(context.world.getBatch(name, batchNumber).patches),
      ).toEqual(true)
    },
  ),
  Then(
    '{editor} reports that it is out of step',
    (context: Context, name: EditorName) => {
      const worldEditor = context.world.getEditor(name)
      const errorCount = worldEditor.editor.errors.length

      expect(errorCount).toBeGreaterThan(worldEditor.checkedErrorCount)
      worldEditor.checkedErrorCount = errorCount
    },
  ),
  Then('{editor} is in step', (context: Context, name: EditorName) => {
    const worldEditor = context.world.getEditor(name)

    expect(
      worldEditor.editor.errors.slice(worldEditor.checkedErrorCount),
    ).toEqual([])
  }),
  Then('the resync is refused', (context: Context) => {
    const resync = context.world.getLastResync()
    const {editor} = context.world.getEditor(resync.editorName)

    expect(editor.warnings.length).toBeGreaterThan(resync.warningCount)
    expect(editor.document.toTextspec({keys: true})).toEqual(resync.screen)
    expect(editor.sentBatches.length).toEqual(resync.batchCount)
  }),
  Then(
    "{editor}'s status is {status}",
    (context: Context, name: EditorName, status: IoEditorStatus) => {
      expect(context.world.getEditor(name).editor.getStatus()).toEqual(status)
    },
  ),
  Then(
    '{editor} has emitted {int} change(s)',
    (context: Context, name: EditorName, count: number) => {
      expect(context.world.getEditor(name).editor.changes.length).toEqual(count)
    },
  ),
  Then(
    '{editor} has emitted no change',
    (context: Context, name: EditorName) => {
      expect(context.world.getEditor(name).editor.changes).toEqual([])
    },
  ),
]

/**
 * Each user step twice: on Editor A when no editor is named, and on the named
 * editor.
 */
function userSteps() {
  const actions = [
    {
      text: '{string} is typed',
      run: (context: Context, name: EditorName, text: string) =>
        context.world.getEditor(name).editor.type(text),
    },
    {
      text: 'the caret is put after {string}',
      run: (context: Context, name: EditorName, text: string) =>
        context.world.getEditor(name).editor.putCaretAfter(text),
    },
    {
      text: 'the style is set to {style}',
      run: (context: Context, name: EditorName, style: string) =>
        context.world.getEditor(name).editor.setStyle(style),
    },
    {
      text: 'the block {textspec} is inserted',
      run: (context: Context, name: EditorName, textspec: string) =>
        context.world.getEditor(name).editor.insertBlock(textspec),
    },
    {
      text: 'the block {string} is deleted',
      run: (context: Context, name: EditorName, text: string) =>
        context.world.getEditor(name).editor.deleteBlock(text),
    },
  ]

  return [
    ...actions.flatMap(({text, run}) => [
      When(text, (context: Context, argument: string) =>
        run(context, 'Editor A', argument),
      ),
      When(
        `${text} in {editor}`,
        (context: Context, argument: string, name: EditorName) =>
          run(context, name, argument),
      ),
    ]),
    When('undo is performed', (context: Context) => {
      context.world.getEditor('Editor A').editor.undo()
    }),
    When(
      'undo is performed in {editor}',
      (context: Context, name: EditorName) => {
        context.world.getEditor(name).editor.undo()
      },
    ),
  ]
}

function duplicateOrMissingKeys(
  value: Array<PortableTextBlock>,
): Array<string> {
  const seen = new Set<string>()

  return value.flatMap((block, index) => {
    const key: unknown = block._key

    if (typeof key !== 'string' || key === '') {
      return [`block ${index} has no key`]
    }

    if (seen.has(key)) {
      return [`block ${index} repeats the key "${key}"`]
    }

    seen.add(key)

    return []
  })
}
