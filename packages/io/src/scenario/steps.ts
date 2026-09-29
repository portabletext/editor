import type {PortableTextBlock} from '@portabletext/schema'
import {Given, Then, When} from 'racejar'
import {
  comparableTextspec,
  createsBlock,
  emptiesField,
  formatTextspec,
} from '../document'
import type {IoEditorStatus} from '../editor'
import {checkEmpty, checkEqual, checkGreaterThan, checkNotEqual} from './check'
import type {BatchReference} from './parameter-types'
import {
  heldTransactionTimeout,
  type EditorName,
  type ServerCopyName,
  type World,
} from './world'

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
    'a script sets the field to {textspec}',
    (context: Context, textspec: string) => {
      context.world.setFieldByScript(textspec)
    },
  ),
  When(
    "{editor} receives the script's change",
    (context: Context, name: EditorName) => {
      context.world.deliverNamed(name, "the script's change")
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
    context.world.advanceClock(heldTransactionTimeout)
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
    context.world.load(name)
  }),
  When('the claim is released', (context: Context) => {
    context.world.releaseClaim('Editor A')
  }),
  When('{editor} becomes read-only', (context: Context, name: EditorName) => {
    context.world.becomeReadOnly(name)
  }),
  When('{editor} is closed', (context: Context, name: EditorName) => {
    context.world.close(name)
  }),

  Then(
    '{editor} shows {textspec}',
    (context: Context, name: EditorName, textspec: string) => {
      const {document} = context.world.getEditor(name).editor
      const {actual, expected} = comparableTextspec(
        {value: document.getValue(), selection: document.getSelection()},
        textspec,
      )

      checkEqual(`What ${name} shows`, actual, expected)
    },
  ),
  Then('the server has {textspec}', (context: Context, textspec: string) => {
    const {actual, expected} = comparableTextspec(
      {value: context.world.getServer().copy().value ?? [], selection: null},
      textspec,
    )

    checkEqual('What the server has', actual, expected)
  }),
  Then('the server has no document', (context: Context) => {
    const copy = context.world.getServer().copy()

    checkEqual("The server's field", describeField(copy.value), 'no field')
    checkEqual("The server's revision", copy.rev, undefined)
  }),
  Then('the server has no field', (context: Context) => {
    const copy = context.world.getServer().copy()

    checkEqual("The server's field", describeField(copy.value), 'no field')
    checkNotEqual("The server's revision", copy.rev, undefined)
  }),
  Then(
    'every block in {editor} has a unique key',
    (context: Context, name: EditorName) => {
      const value = context.world.getEditor(name).editor.document.getValue()

      checkEmpty(`Key problems in ${name}`, duplicateOrMissingKeys(value))
    },
  ),
  Then('every block on the server has a unique key', (context: Context) => {
    const value = context.world.getServer().copy().value ?? []

    checkEmpty('Key problems on the server', duplicateOrMissingKeys(value))
  }),
  Then(
    '{editor} has sent batch {int}',
    (context: Context, name: EditorName, batchNumber: number) => {
      const worldEditor = context.world.getEditor(name)

      checkEqual(
        `The batches ${name} has sent`,
        worldEditor.heard.mutations.length,
        batchNumber,
      )
      worldEditor.checkedBatchCount = batchNumber
    },
  ),
  Then(
    '{editor} has sent nothing new',
    (context: Context, name: EditorName) => {
      const worldEditor = context.world.getEditor(name)

      checkEqual(
        `The batches ${name} has sent`,
        worldEditor.heard.mutations.length,
        worldEditor.checkedBatchCount,
      )
    },
  ),
  Then(
    '{editor} has sent a final batch',
    (context: Context, name: EditorName) => {
      const worldEditor = context.world.getEditor(name)

      checkEqual(
        `Whether ${name}'s last batch is final`,
        worldEditor.heard.mutations.at(-1)?.final,
        true,
      )
      worldEditor.checkedBatchCount = worldEditor.heard.mutations.length
    },
  ),
  Then(
    "{editor}'s batch {int} creates the block",
    (context: Context, name: EditorName, batchNumber: number) => {
      checkEqual(
        `Whether ${name}'s batch ${batchNumber} creates the block`,
        createsBlock(context.world.getBatch(name, batchNumber).patches),
        true,
      )
    },
  ),
  Then(
    "{editor}'s batch {int} does not create a block",
    (context: Context, name: EditorName, batchNumber: number) => {
      checkEqual(
        `Whether ${name}'s batch ${batchNumber} creates a block`,
        createsBlock(context.world.getBatch(name, batchNumber).patches),
        false,
      )
    },
  ),
  Then(
    "{editor}'s batch {int} empties the field",
    (context: Context, name: EditorName, batchNumber: number) => {
      checkEqual(
        `Whether ${name}'s batch ${batchNumber} empties the field`,
        emptiesField(context.world.getBatch(name, batchNumber).patches),
        true,
      )
    },
  ),
  Then(
    '{editor} reports that it is out of step',
    (context: Context, name: EditorName) => {
      const worldEditor = context.world.getEditor(name)
      const errorCount = worldEditor.heard.errors.length

      checkGreaterThan(
        `The errors ${name} has reported`,
        errorCount,
        worldEditor.checkedErrorCount,
      )
      worldEditor.checkedErrorCount = errorCount
    },
  ),
  Then('{editor} is in step', (context: Context, name: EditorName) => {
    const worldEditor = context.world.getEditor(name)

    checkEmpty(
      `New errors from ${name}`,
      worldEditor.heard.errors.slice(worldEditor.checkedErrorCount),
    )
  }),
  Then('{editor} has been warned', (context: Context, name: EditorName) => {
    const worldEditor = context.world.getEditor(name)
    const warningCount = worldEditor.heard.warnings.length

    checkGreaterThan(
      `The warnings ${name} has given`,
      warningCount,
      worldEditor.checkedWarningCount,
    )
    worldEditor.checkedWarningCount = warningCount
  }),
  Then('the resync is refused', (context: Context) => {
    const resync = context.world.getLastResync()
    const {editor, heard} = context.world.getEditor(resync.editorName)

    checkGreaterThan(
      `The warnings ${resync.editorName} has given`,
      heard.warnings.length,
      resync.warningCount,
    )
    checkEqual(
      `What ${resync.editorName} shows`,
      editor.document.toTextspec({keys: true}),
      resync.screen,
    )
    checkEqual(
      `The batches ${resync.editorName} has sent`,
      heard.mutations.length,
      resync.batchCount,
    )
  }),
  Then(
    "{editor}'s status is {status}",
    (context: Context, name: EditorName, status: IoEditorStatus) => {
      checkEqual(
        `${name}'s status`,
        context.world.getEditor(name).editor.getStatus(),
        status,
      )
    },
  ),
  Then(
    '{editor} has emitted {int} change(s)',
    (context: Context, name: EditorName, count: number) => {
      checkEqual(
        `The changes ${name} has emitted`,
        context.world.getEditor(name).heard.changes.length,
        count,
      )
    },
  ),
  Then(
    '{editor} has emitted no change',
    (context: Context, name: EditorName) => {
      checkEqual(
        `The changes ${name} has emitted`,
        context.world.getEditor(name).heard.changes.length,
        0,
      )
    },
  ),
]

function userSteps() {
  const actions = [
    {
      text: '{string} is typed',
      run: (context: Context, name: EditorName, text: string) =>
        context.world.type(name, text),
    },
    {
      text: '{string} is deleted before the caret',
      run: (context: Context, name: EditorName, text: string) =>
        context.world.deleteBeforeCaret(name, text),
    },
    {
      text: 'the caret is put after {string}',
      run: (context: Context, name: EditorName, text: string) =>
        context.world.putCaretAfter(name, text),
    },
    {
      text: 'the style is set to {style}',
      run: (context: Context, name: EditorName, style: string) =>
        context.world.setStyle(name, style),
    },
    {
      text: 'the block {textspec} is inserted',
      run: (context: Context, name: EditorName, textspec: string) =>
        context.world.insertBlock(name, textspec),
    },
    {
      text: 'the block {string} is deleted',
      run: (context: Context, name: EditorName, text: string) =>
        context.world.deleteBlock(name, text),
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
      context.world.undo('Editor A')
    }),
    When(
      'undo is performed in {editor}',
      (context: Context, name: EditorName) => {
        context.world.undo(name)
      },
    ),
  ]
}

function describeField(value: Array<PortableTextBlock> | undefined): string {
  return value === undefined ? 'no field' : formatTextspec(value)
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
