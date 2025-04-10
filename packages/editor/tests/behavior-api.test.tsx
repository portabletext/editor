import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
} from '../src'
import {defineBehavior, effect, execute, noop, raise} from '../src/behaviors'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {BehaviorPlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('Behavior API', () => {
  test('Scenario: Suppressing raised events while executing', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [raise({type: 'insert.text', text: 'b'})]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'b',
              // The insertion of 'a' is executed, which means the event
              // doesn't trigger any other Behavior from this point.
              // Hence, no infinite loop is created.
              actions: [() => [execute({type: 'insert.text', text: 'a'})]],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value()),
      ).toEqual(['a'])
    })
  })

  test('Scenario: Executing custom events', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              // As an exception, you can execute custom events and this *will*
              // trigger any Behavior that listens for this event
              actions: [() => [execute({type: 'custom.raise b'})]],
            }),
            defineBehavior({
              on: 'custom.raise b',
              // But any `raise` further down the chain will be suppressed to
              // an execution.
              actions: [() => [raise({type: 'insert.text', text: 'b'})]],
            }),
            defineBehavior({
              on: 'insert.text',
              // Not called
              guard: ({event}) => event.text === 'b',
              actions: [() => [execute({type: 'insert.text', text: 'c'})]],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value()),
      ).toEqual(['b'])
    })
  })

  test('Scenario: Raising one custom event as the result of executing another', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              // Executing `custom.a`
              actions: [() => [execute({type: 'custom.a'})]],
            }),
            defineBehavior({
              on: 'custom.a',
              // Suppresses this into an `execute`
              actions: [() => [raise({type: 'custom.b'})]],
            }),
            defineBehavior({
              on: 'custom.b',
              // Which ends up executing this
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
            defineBehavior({
              on: 'custom.b',
              // But not this, of course
              actions: [() => [execute({type: 'insert.text', text: 'c'})]],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value()),
      ).toEqual(['b'])
    })
  })

  test('Scenario: Sending custom events', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.hello world',
              actions: [
                () => [execute({type: 'insert.text', text: 'Hello, world!'})],
              ],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editorRef.current?.send({type: 'custom.hello world'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value()),
      ).toEqual(['Hello, world!'])
    })
  })

  test('Scenario: Raised events default to their default action', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.hello world',
              actions: [
                // No Behavior listens for this event, so it ends up being
                // executed.
                () => [raise({type: 'insert.text', text: 'Hello, world!'})],
              ],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editorRef.current?.send({type: 'custom.hello world'})

    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value()),
      ).toEqual(['Hello, world!'])
    })
  })

  test("Scenario: Empty action sets don't affect the chain of events", async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => []],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [], () => []],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value()),
      ).toEqual(['b'])
    })
  })

  test("Scenario: Effect-only actions don't affect the chain of events", async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [effect(() => {})]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value()),
      ).toEqual(['b'])
    })
  })

  test('Scenario: Noop actions cancel the chain of events', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [noop()]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
          ]}
        />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(
        getTersePt(editorRef.current?.getSnapshot().context.value()),
      ).toEqual([''])
    })
  })
})
