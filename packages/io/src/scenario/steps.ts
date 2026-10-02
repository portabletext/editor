import {set} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {Given, Then, When, type StepDefinition} from 'racejar'
import {
  comparableTextspec,
  createsBlock,
  emptiesField,
  formatTextspec,
} from '../fakes/document'
import type {FakeDocumentStatus} from '../fakes/document'
import type {RequestFailure} from '../protocol/host'
import type {
  ChangeEvent,
  EditorMessageForIo,
  ErrorEvent,
  WorkDropped,
} from '../protocol/types'
import {checkEmpty, checkEqual, checkGreaterThan, checkNotEqual} from './check'
import type {MutationReference, ExpectedSync} from './parameter-types'
import {
  heldTransactionTimeout,
  type Corruption,
  type EditorName,
  type ServerCopyName,
  type World,
} from './world'

export type Context = {world: World}

/**
 * Every step ends by checking that each editor's tree equals io's working
 * copy, both at the end of the step and right after every message and local
 * change during it.
 */
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
  Given(
    "the server's block {key} {corruption}",
    (context: Context, key: string, corruption: Corruption) => {
      context.world.corruptServerBlock(key, corruption)
    },
  ),
  Given('the editors are in their first commit', (context: Context) => {
    context.world.startEditors()
  }),
  Given(
    'hosts that fold mutations into shared requests',
    (context: Context) => {
      context.world.setHostShape('folding')
    },
  ),
  Given('hosts that confirm each mutation themselves', (context: Context) => {
    context.world.setHostShape('self-confirming')
  }),
  Given("transactions that carry the server's copy", (context: Context) => {
    context.world.carryServerCopyOnTransactions()
  }),

  ...userSteps(),

  When(
    "the server receives {editor}'s mutation {int}",
    (context: Context, name: EditorName, mutationNumber: number) => {
      context.world.receive(name, mutationNumber)
    },
  ),
  When(
    'the server receives {mutation} and {mutation} as one transaction',
    (context: Context, first: MutationReference, second: MutationReference) => {
      context.world.receiveAsOne(first, second)
    },
  ),
  When(
    "the server receives {editor}'s final mutation",
    (context: Context, name: EditorName) => {
      context.world.receiveFinal(name)
    },
  ),
  When(
    "the server's next request fails with {failure}",
    (context: Context, failure: RequestFailure) => {
      context.world.failNextRequest(failure)
    },
  ),
  When(
    "the host rewrites {editor}'s mutation {int} as a whole-field unset",
    (context: Context, name: EditorName, mutationNumber: number) => {
      context.world.rewriteAsWholeFieldUnset(name, mutationNumber)
    },
  ),
  When(
    "the save reply for {editor}'s mutation {int} is lost",
    (context: Context, name: EditorName, mutationNumber: number) => {
      context.world.loseReply(name, mutationNumber)
    },
  ),
  When(
    "{editor}'s mutation {int} is retried",
    (context: Context, name: EditorName, mutationNumber: number) => {
      context.world.retry(name, mutationNumber)
    },
  ),
  When("{editor}'s feed is lost", (context: Context, name: EditorName) => {
    context.world.feedLost(name)
  }),
  When(
    'another field of the document is changed on the server',
    (context: Context) => {
      context.world.changeOtherField()
    },
  ),
  When(
    "{editor} receives {editor}'s mutation {int}",
    (
      context: Context,
      receiverName: EditorName,
      senderName: EditorName,
      mutationNumber: number,
    ) => {
      context.world.deliverMutation(receiverName, senderName, mutationNumber)
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
    "a script changes the server's block {key} so it {corruption}",
    (context: Context, key: string, corruption: Corruption) => {
      context.world.corruptByScript(key, corruption)
    },
  ),
  When(
    "the server's copy changes without a transaction so its block {key} {corruption}",
    (context: Context, key: string, corruption: Corruption) => {
      context.world.alterServerCopy(key, corruption)
    },
  ),
  When(
    "{editor} receives the script's corruption",
    (context: Context, name: EditorName) => {
      context.world.deliverNamed(name, "the script's corruption")
    },
  ),
  When(
    "{editor}'s mutation {int} comes back",
    (context: Context, name: EditorName, mutationNumber: number) => {
      context.world.deliverMutation(name, name, mutationNumber)
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
  When('{int} seconds pass', (context: Context, seconds: number) => {
    context.world.advanceClock(seconds * 1000)
  }),

  When(
    "the save reply for {editor}'s mutation {int} arrives",
    (context: Context, name: EditorName, mutationNumber: number) => {
      context.world.deliverReply(name, mutationNumber)
    },
  ),
  When('{editor} is resynced', (context: Context, name: EditorName) => {
    context.world.resync(name, {discardUnsent: false})
  }),
  When(
    '{editor} is resynced with the outcome of mutation {int}',
    (context: Context, name: EditorName, mutationNumber: number) => {
      context.world.resync(name, {
        discardUnsent: false,
        outcomeOf: mutationNumber,
      })
    },
  ),
  When(
    '{editor} is resynced, discarding unsent changes',
    (context: Context, name: EditorName) => {
      context.world.resync(name, {discardUnsent: true})
    },
  ),
  When('{editor} is loaded', (context: Context, name: EditorName) => {
    context.world.load(name)
  }),
  When('{editor} is loaded again', (context: Context, name: EditorName) => {
    context.world.loadAgain(name)
  }),
  When("{editor}'s first commit ends", (context: Context, name: EditorName) => {
    context.world.endFirstCommit(name)
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
      const {document} = context.world.getEditor(name)
      const {actual, expected} = comparableTextspec(
        {value: document.getValue(), selection: document.getSelection()},
        textspec,
      )

      checkEqual(`What ${name} shows`, actual, expected)
    },
  ),
  Then('the server has {textspec}', (context: Context, textspec: string) => {
    const {actual, expected} = comparableTextspec(
      {
        value: (context.world.getServer().copy().value ?? []).filter(isObject),
        selection: null,
      },
      textspec,
    )

    checkEqual('What the server has, blocks that are objects', actual, expected)
  }),
  Then('the server has a block that is not an object', (context: Context) => {
    checkEqual(
      'Whether the server has a block that is not an object',
      (context.world.getServer().copy().value ?? []).some(
        (block) => !isObject(block),
      ),
      true,
    )
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
  Then('the server has an empty list', (context: Context) => {
    const copy = context.world.getServer().copy()

    checkEqual("The server's field", describeField(copy.value), 'an empty list')
  }),
  Then(
    'every block in {editor} has a unique key',
    (context: Context, name: EditorName) => {
      const value = context.world.getEditor(name).document.getValue()

      checkEmpty(`Key problems in ${name}`, duplicateOrMissingKeys(value))
    },
  ),
  Then('every block on the server has a unique key', (context: Context) => {
    const value = context.world.getServer().copy().value ?? []

    checkEmpty('Key problems on the server', duplicateOrMissingKeys(value))
  }),
  Then(
    '{editor} has sent mutation {int}',
    (context: Context, name: EditorName, mutationNumber: number) => {
      const worldEditor = context.world.getEditor(name)

      checkEqual(
        `The mutations ${name} has sent`,
        worldEditor.heard.mutations.length,
        mutationNumber,
      )
      worldEditor.checkedMutationCount = mutationNumber
    },
  ),
  Then(
    '{editor} has sent nothing new',
    (context: Context, name: EditorName) => {
      const worldEditor = context.world.getEditor(name)

      checkEqual(
        `The mutations ${name} has sent`,
        worldEditor.heard.mutations.length,
        worldEditor.checkedMutationCount,
      )
    },
  ),
  Then(
    '{editor} has sent a final mutation',
    (context: Context, name: EditorName) => {
      const worldEditor = context.world.getEditor(name)

      checkEqual(
        `Whether ${name}'s last mutation is final`,
        worldEditor.heard.mutations.at(-1)?.final,
        true,
      )
      worldEditor.checkedMutationCount = worldEditor.heard.mutations.length
    },
  ),
  Then(
    "{editor}'s mutation {int} creates the block",
    (context: Context, name: EditorName, mutationNumber: number) => {
      checkEqual(
        `Whether ${name}'s mutation ${mutationNumber} creates the block`,
        createsBlock(context.world.getMutation(name, mutationNumber).patches),
        true,
      )
    },
  ),
  Then(
    "{editor}'s mutation {int} does not create a block",
    (context: Context, name: EditorName, mutationNumber: number) => {
      checkEqual(
        `Whether ${name}'s mutation ${mutationNumber} creates a block`,
        createsBlock(context.world.getMutation(name, mutationNumber).patches),
        false,
      )
    },
  ),
  Then(
    "{editor}'s mutation {int} does not empty the field",
    (context: Context, name: EditorName, mutationNumber: number) => {
      checkEqual(
        `Whether ${name}'s mutation ${mutationNumber} empties the field`,
        emptiesField(context.world.getMutation(name, mutationNumber).patches),
        false,
      )
    },
  ),
  Then(
    "{editor}'s mutation {int} empties the field",
    (context: Context, name: EditorName, mutationNumber: number) => {
      checkEqual(
        `Whether ${name}'s mutation ${mutationNumber} empties the field`,
        emptiesField(context.world.getMutation(name, mutationNumber).patches),
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
  Then(
    '{editor} reports that it is out of step, with reason {errorReason}',
    (context: Context, name: EditorName, reason: ErrorEvent['reason']) => {
      const worldEditor = context.world.getEditor(name)
      const {errors} = worldEditor.heard

      checkEqual(
        `The reasons of the errors ${name} has reported since the last check`,
        JSON.stringify(
          errors
            .slice(worldEditor.checkedErrorCount)
            .map((error) => error.reason),
        ),
        JSON.stringify([reason]),
      )
      worldEditor.checkedErrorCount = errors.length
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
  Then(
    '{editor} has been told work was dropped',
    (context: Context, name: EditorName) => {
      const worldEditor = context.world.getEditor(name)
      const workDroppedCount = worldEditor.heard.workDropped.length

      checkGreaterThan(
        `The dropped work ${name} has reported`,
        workDroppedCount,
        worldEditor.checkedWorkDroppedCount,
      )
      worldEditor.checkedWorkDroppedCount = workDroppedCount
    },
  ),
  Then(
    '{editor} has been told work was dropped, with reason {dropReason}',
    (context: Context, name: EditorName, reason: WorkDropped['reason']) => {
      const worldEditor = context.world.getEditor(name)
      const {workDropped} = worldEditor.heard

      checkEqual(
        `Whether ${name} has reported dropped work with reason "${reason}"`,
        workDropped
          .slice(worldEditor.checkedWorkDroppedCount)
          .some((dropped) => dropped.reason === reason),
        true,
      )
      worldEditor.checkedWorkDroppedCount = workDropped.length
    },
  ),
  Then(
    "the retry of {editor}'s mutation {int} was refused as a duplicate",
    (context: Context, name: EditorName, mutationNumber: number) => {
      const mutationId = context.world.getMutation(name, mutationNumber).id

      checkEqual(
        `Whether the server refused a retry of ${name}'s mutation ${mutationNumber} as a duplicate`,
        context.world
          .getServer()
          .getDuplicates()
          .some((duplicate) => duplicate.mutationIds.includes(mutationId)),
        true,
      )
    },
  ),
  Then(
    "the server has saved {editor}'s mutation {int} once",
    (context: Context, name: EditorName, mutationNumber: number) => {
      const mutationId = context.world.getMutation(name, mutationNumber).id

      checkEqual(
        `The transactions carrying ${name}'s mutation ${mutationNumber}`,
        context.world
          .getServer()
          .getTransactions()
          .filter((transaction) => transaction.mutationIds.includes(mutationId))
          .length,
        1,
      )
    },
  ),
  Then(
    "the server saved {editor}'s mutation {int} under the transaction ID it proposed",
    (context: Context, name: EditorName, mutationNumber: number) => {
      const mutation = context.world.getMutation(name, mutationNumber)

      checkEqual(
        `The transaction carrying ${name}'s mutation ${mutationNumber}`,
        context.world
          .getServer()
          .getTransactions()
          .find((transaction) => transaction.mutationIds.includes(mutation.id))
          ?.transactionId,
        mutation.transactionId,
      )
    },
  ),
  Then(
    "{editor}'s host has named the transaction for mutation {int}",
    (context: Context, name: EditorName, mutationNumber: number) => {
      const mutationId = context.world.getMutation(name, mutationNumber).id

      checkEqual(
        `Whether ${name}'s host sent \`mutation sent\` for mutation ${mutationNumber}`,
        context.world
          .getEditor(name)
          .mutationsSent.some((mutationSent) => mutationSent.id === mutationId),
        true,
      )
    },
  ),
  Then(
    "{editor}'s host has not named a transaction",
    (context: Context, name: EditorName) => {
      checkEmpty(
        `The \`mutation sent\` messages ${name}'s host sent`,
        context.world.getEditor(name).mutationsSent,
      )
    },
  ),
  Then('the resync is refused', (context: Context) => {
    const resync = context.world.getLastResync()
    const {document, heard} = context.world.getEditor(resync.editorName)

    checkGreaterThan(
      `The warnings ${resync.editorName} has given`,
      heard.warnings.length,
      resync.warningCount,
    )
    checkEqual(
      `What ${resync.editorName} shows`,
      document.toTextspec({keys: true}),
      resync.screen,
    )
    checkEqual(
      `The mutations ${resync.editorName} has sent`,
      heard.mutations.length,
      resync.mutationCount,
    )
  }),
  Then('the load was refused', (context: Context) => {
    const load = context.world.getLastLoad()
    const {document} = context.world.getEditor(load.editorName)

    checkEqual(`Whether loading ${load.editorName} threw`, load.threw, true)
    checkEqual(`${load.editorName}'s status`, document.getStatus(), 'ready')
    checkEqual(
      `What ${load.editorName} shows`,
      document.toTextspec({keys: true}),
      load.screen,
    )
  }),
  Then(
    "{editor}'s status is {status}",
    (context: Context, name: EditorName, status: FakeDocumentStatus) => {
      checkEqual(
        `${name}'s status`,
        context.world.getEditor(name).document.getStatus(),
        status,
      )
    },
  ),
  Then(
    "{editor}'s sync is {sync}",
    (context: Context, name: EditorName, sync: ExpectedSync) => {
      checkEqual(
        `${name}'s sync`,
        context.world.getEditor(name).io.getSnapshot().context.sync,
        sync,
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
    "{editor}'s change {int} carries the patches of mutation {int}",
    (
      context: Context,
      name: EditorName,
      changeNumber: number,
      mutationNumber: number,
    ) => {
      const change = getChange(context, name, changeNumber)

      checkEqual(
        `The patches ${name}'s change ${changeNumber} carries`,
        JSON.stringify(change.origin === 'local' ? change.patches : undefined),
        JSON.stringify(context.world.getMutation(name, mutationNumber).patches),
      )
    },
  ),
  Then(
    "{editor}'s change {int} carries no patches",
    (context: Context, name: EditorName, changeNumber: number) => {
      checkEqual(
        `Whether ${name}'s change ${changeNumber} carries patches`,
        'patches' in getChange(context, name, changeNumber),
        false,
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
  Then(
    "{editor}'s last apply carries no patches",
    (context: Context, name: EditorName) => {
      checkEqual(
        `The patches of ${name}'s last apply`,
        JSON.stringify(getLastApply(context, name).patches),
        JSON.stringify([]),
      )
    },
  ),
  Then(
    "{editor}'s last apply carries the patches of {editor}'s mutation {int}",
    (
      context: Context,
      name: EditorName,
      senderName: EditorName,
      mutationNumber: number,
    ) => {
      checkEqual(
        `The patches of ${name}'s last apply`,
        JSON.stringify(getLastApply(context, name).patches),
        JSON.stringify(
          context.world.getMutation(senderName, mutationNumber).patches,
        ),
      )
    },
  ),
  Then(
    "{editor}'s last apply has {editor}'s mutation {int} underneath",
    (
      context: Context,
      name: EditorName,
      senderName: EditorName,
      mutationNumber: number,
    ) => {
      checkEqual(
        `What ${name}'s last apply has underneath`,
        JSON.stringify(getLastApply(context, name).underneath),
        JSON.stringify(
          context.world.getMutation(senderName, mutationNumber).patches,
        ),
      )
    },
  ),
  Then(
    "{editor}'s last apply sets the whole block {string}",
    (context: Context, name: EditorName, text: string) => {
      const block = findBlockByText(
        context.world.getEditor(name).document.getValue(),
        text,
      )

      checkEqual(
        `The patches of ${name}'s last apply`,
        JSON.stringify(getLastApply(context, name).patches),
        JSON.stringify([set(block, [{_key: block._key}])]),
      )
    },
  ),
].map(checkingTrees)

function checkingTrees(
  definition: StepDefinition<Context, any, any, any>,
): StepDefinition<Context, any, any, any> {
  const callback: (
    context: Context,
    paramA: unknown,
    paramB: unknown,
    paramC: unknown,
  ) => Promise<void> | void = definition.callback

  return {
    ...definition,
    callback: (
      context: Context,
      paramA: unknown,
      paramB: unknown,
      paramC: unknown,
    ) => {
      const result = callback(context, paramA, paramB, paramC)

      if (result instanceof Promise) {
        return result.then(() => checkTrees(context))
      }

      return checkTrees(context)
    },
  }
}

function checkTrees(context: Context) {
  checkEmpty(
    "Where an editor's tree differed from io's working copy",
    context.world.takeTreeMismatches(),
  )
}

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
    When('the block is split at the caret', (context: Context) => {
      context.world.splitAtCaret('Editor A')
    }),
    When(
      'the block is split at the caret in {editor}',
      (context: Context, name: EditorName) => {
        context.world.splitAtCaret(name)
      },
    ),
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

function getChange(
  context: Context,
  name: EditorName,
  changeNumber: number,
): ChangeEvent {
  const change = context.world.getEditor(name).heard.changes[changeNumber - 1]

  if (!change) {
    throw new Error(`${name} has not emitted change ${changeNumber}`)
  }

  return change
}

function getLastApply(
  context: Context,
  name: EditorName,
): Extract<EditorMessageForIo, {type: 'apply'}> {
  const apply = context.world
    .getEditor(name)
    .received.findLast((message) => message.type === 'apply')

  if (apply?.type !== 'apply') {
    throw new Error(`${name} has not been sent an apply`)
  }

  return apply
}

function findBlockByText(
  value: Array<PortableTextBlock>,
  text: string,
): PortableTextBlock {
  const matches = value.filter((block) => blockText(block) === text)

  if (matches.length !== 1) {
    throw new Error(
      `Expected one block with the text "${text}", found ${matches.length}`,
    )
  }

  return matches[0]
}

function blockText(block: PortableTextBlock): string {
  const children: unknown = Reflect.get(block, 'children')

  return Array.isArray(children)
    ? children
        .map((child: unknown) => {
          const text: unknown =
            typeof child === 'object' && child !== null
              ? Reflect.get(child, 'text')
              : undefined

          return typeof text === 'string' ? text : ''
        })
        .join('')
    : ''
}

function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeField(value: Array<PortableTextBlock> | undefined): string {
  if (value === undefined) {
    return 'no field'
  }

  return value.length === 0 ? 'an empty list' : formatTextspec(value)
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
