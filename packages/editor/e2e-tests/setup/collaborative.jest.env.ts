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

ipc.config.id = 'collaborative-jest-environment-ipc-client'
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
  private _browserA?: Browser
  private _browserB?: Browser
  private _pageA?: Page
  private _pageB?: Page
  private _contextA?: BrowserContext
  private _contextB?: BrowserContext
  private _scenario?: string

  // Saving these setup/teardown functions here for future reference.
  // public async setup(): Promise<void> {
  //   await super.setup()
  // }
  // public async teardown(): Promise<void> {
  //   await super.teardown()
  // }

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
    this._browserA = await chromium.launch()
    this._browserB = await chromium.launch()
    const contextA = await this._browserA.newContext()
    const contextB = await this._browserB.newContext()
    await contextA.grantPermissions(['clipboard-read', 'clipboard-write'])
    await contextB.grantPermissions(['clipboard-read', 'clipboard-write'])
    this._contextA = contextA
    this._contextB = contextB
    this._pageA = await this._contextA.newPage()
    this._pageB = await this._contextB.newPage()
  }

  private async _destroyInstance(): Promise<void> {
    await this._pageA?.close()
    await this._pageB?.close()
    await this._browserA?.close()
    await this._browserB?.close()
    ipc.disconnect('socketServer')
  }

  private async _createNewTestPage(): Promise<void> {
    if (!this._pageA || !this._pageB) {
      throw new Error('Page not initialized')
    }

    // This will identify this test throughout the web environment
    const testId = (Math.random() + 1).toString(36).slice(7)

    // Hook up page console and npm debug in the PTE
    if (DEBUG) {
      await this._pageA.addInitScript((filter: string) => {
        window.localStorage.debug = filter
      }, DEBUG)
      await this._pageB.addInitScript((filter: string) => {
        window.localStorage.debug = filter
      }, DEBUG)
      this._pageA.on('console', (message) =>
        console.log(
          `A:${message.type().slice(0, 3).toUpperCase()} ${message.text()}`,
        ),
      )
      this._pageB.on('console', (message) =>
        console.log(
          `B:${message.type().slice(0, 3).toUpperCase()} ${message.text()}`,
        ),
      )
    }
    this._pageA.on('pageerror', (error) => {
      console.error(
        `Editor A crashed${this._scenario ? ` (${this._scenario})` : ''}`,
        error,
      )
      throw error
    })
    this._pageB.on('pageerror', (error) => {
      console.error(
        `Editor B crashed${this._scenario ? ` (${this._scenario})` : ''}`,
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
      await this._pageA?.waitForSelector(`code[data-rev-id="${revId}"]`, {
        timeout: REVISION_TIMEOUT_MS,
      })
      await this._pageB?.waitForSelector(`code[data-rev-id="${revId}"]`, {
        timeout: REVISION_TIMEOUT_MS,
      })
    }

    this.global.waitForRevision = async () => {
      const pageARevIdHandle = await this._pageA?.waitForSelector('#pte-revId')
      const pageBRevIdHandle = await this._pageB?.waitForSelector('#pte-revId')
      const pageACurrentRevId = await pageARevIdHandle!.evaluate((node) =>
        node instanceof HTMLElement && node.innerText
          ? JSON.parse(node.innerText)?.revId
          : null,
      )
      const pageBCurrentRevId = await pageBRevIdHandle!.evaluate((node) =>
        node instanceof HTMLElement && node.innerText
          ? JSON.parse(node.innerText)?.revId
          : null,
      )
      const pageARevIdChanged = () =>
        this._pageA?.waitForSelector(
          `code[data-rev-id]:not([data-rev-id='${pageACurrentRevId}'])`,
          {
            timeout: REVISION_TIMEOUT_MS,
          },
        )
      const pageBRevIdChanged = () =>
        this._pageA?.waitForSelector(
          `code[data-rev-id]:not([data-rev-id='${pageBCurrentRevId}'])`,
          {
            timeout: REVISION_TIMEOUT_MS,
          },
        )

      return Promise.all([pageARevIdChanged(), pageBRevIdChanged()])
        .then(() => Promise.resolve())
        .catch(() => Promise.resolve())
    }

    this.global.getEditor = () => {
      return Promise.reject(
        new Error(
          'Looks like you are trying to run the collaborative test env with just one editor.',
        ),
      )
    }

    this.global.getEditors = () =>
      Promise.all(
        [this._pageA!, this._pageB!].map(async (page, index) => {
          const editorId = `${['A', 'B'][index]}${testId}`

          return getPageEditor({
            editorId,
            page,
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
        }),
      )

    // Open up the test documents
    await this._pageA?.goto(
      `${WEB_SERVER_ROOT_URL}?editorId=A${testId}&testId=${testId}`,
      {
        waitUntil: 'load',
      },
    )
    await this._pageB?.goto(
      `${WEB_SERVER_ROOT_URL}?editorId=B${testId}&testId=${testId}`,
      {
        waitUntil: 'load',
      },
    )
  }
}
