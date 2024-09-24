import type {Circus} from '@jest/types'
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test'
import type {PortableTextBlock} from '@sanity/types'
import NodeEnvironment from 'jest-environment-node'
import ipc from 'node-ipc'
import {getPageEditor} from './get-page-editor'

ipc.config.id = 'jest-environment-ipc-client'
ipc.config.retry = 5000
ipc.config.networkPort = 3002
ipc.config.silent = true

const WEB_SERVER_ROOT_URL = 'http://localhost:3000'

// Forward debug info from the PTE in the browsers
// const DEBUG = 'sanity-pte:*'
const DEBUG = process.env.DEBUG || false

// Wait this long for selections to appear in the browser
// This should be set high to support slower host systems.
const SELECTION_TIMEOUT_MS = 5000

// How long to wait for a new revision to come back to the client(s) when patched through the server.
// This should be set high to support slower host systems.
const REVISION_TIMEOUT_MS = 5000

export default class CollaborationEnvironment extends NodeEnvironment {
  private _browser?: Browser
  private _page?: Page
  private _context?: BrowserContext
  private _scenario?: string

  public async handleTestEvent(event: {
    name: string
    test?: Circus.TestEntry
  }): Promise<void> {
    if (event.name === 'run_start') {
      await this._setupInstance()
    }
    if (event.name === 'test_start') {
      await this._createNewTestPage()
      if (event.test?.name) {
        this._scenario = event.test.name
      }
    }
    if (event.name === 'run_finish') {
      await this._destroyInstance()
    }
  }

  private async _setupInstance(): Promise<void> {
    ipc.connectToNet('socketServer')
    this._browser = await chromium.launch()
    const context = await this._browser.newContext()
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    this._context = context
    this._page = await this._context.newPage()
  }

  private async _destroyInstance(): Promise<void> {
    await this._page?.close()
    await this._browser?.close()
    ipc.disconnect('socketServer')
  }

  private async _createNewTestPage(): Promise<void> {
    if (!this._page) {
      throw new Error('Page not initialized')
    }

    // This will identify this test throughout the web environment
    const testId = (Math.random() + 1).toString(36).slice(7)

    // Hook up page console and npm debug in the PTE
    if (DEBUG) {
      await this._page.addInitScript((filter: string) => {
        window.localStorage.debug = filter
      }, DEBUG)
      this._page.on('console', (message) =>
        console.log(
          `A:${message.type().slice(0, 3).toUpperCase()} ${message.text()}`,
        ),
      )
    }
    this._page.on('pageerror', (error) => {
      console.error(
        `Editor crashed${this._scenario ? ` (${this._scenario})` : ''}`,
        error,
      )
      throw error
    })

    this.global.setDocumentValue = async (
      value: PortableTextBlock[] | undefined,
    ): Promise<void> => {
      const revId = (Math.random() + 1).toString(36).slice(7)
      ipc.of.socketServer.emit(
        'payload',
        JSON.stringify({type: 'value', value, testId, revId}),
      )
      await this._page?.waitForSelector(`code[data-rev-id="${revId}"]`, {
        timeout: REVISION_TIMEOUT_MS,
      })
    }

    this.global.waitForRevision = async () => {
      const pageRevIdHandle = await this._page?.waitForSelector('#pte-revId')
      const pageCurrentRevId = await pageRevIdHandle!.evaluate((node) =>
        node instanceof HTMLElement && node.innerText
          ? JSON.parse(node.innerText)?.revId
          : null,
      )
      const pageRevIdChanged = () =>
        this._page?.waitForSelector(
          `code[data-rev-id]:not([data-rev-id='${pageCurrentRevId}'])`,
          {
            timeout: REVISION_TIMEOUT_MS,
          },
        )

      return Promise.all([pageRevIdChanged()])
        .then(() => Promise.resolve())
        .catch(() => Promise.resolve())
    }

    this.global.getEditor = async () => {
      const editorId = `A${testId}`

      return getPageEditor({
        page: this._page!,
        editorId,
        testId,
        onSelection: (selection) => {
          ipc.of.socketServer.emit(
            'payload',
            JSON.stringify({
              type: 'selection',
              selection,
              testId,
              editorId,
            }),
          )
        },
        REVISION_TIMEOUT_MS,
        SELECTION_TIMEOUT_MS,
      })
    }

    this.global.getEditors = () => {
      return Promise.reject(
        new Error(
          'Looks like you are trying to run the non-collaborative test env with two editors.',
        ),
      )
    }

    // Open up the test document
    await this._page?.goto(
      `${WEB_SERVER_ROOT_URL}?editorId=A${testId}&testId=${testId}`,
      {
        waitUntil: 'load',
      },
    )
  }
}
