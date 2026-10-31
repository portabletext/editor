// Chrome DevTools protocol over `adb forward`: the target list through fetch, one Runtime.evaluate per
// connection through the global WebSocket.

import {adb} from './adb.ts'
import {currentSignal, errorRepr, phase, sleep, tracked} from './util.ts'

export const CDP_PORT = 9222

/** No page target matches the current URL. Not retried. */
export class NoTargetError extends Error {
  override name = 'NoTargetError'
}

/** The page answered with a protocol error. Not retried. */
export class ProtocolError extends Error {
  override name = 'ProtocolError'
}

/**
 * The evaluated expression threw in the page. It can be an editor result, so neither `cdpEval` nor
 * `withDriverRetry` retries it.
 */
export class PageExceptionError extends Error {
  override name = 'PageExceptionError'
}

export class WebSocketError extends Error {
  override name = 'WebSocketError'
}

/** The target list did not answer in time. */
export class ReadTimeout extends Error {
  override name = 'ReadTimeout'
}

export type Target = {type?: string; url?: string; attached?: boolean; webSocketDebuggerUrl?: string}

/** The DevTools target list. 127.0.0.1, because adb forward listens on IPv4 only. */
export async function targets(timeout: number): Promise<Target[]> {
  try {
    const attempt = currentSignal()
    const deadline = AbortSignal.timeout(timeout * 1000)
    const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json`, {signal: attempt ? AbortSignal.any([attempt, deadline]) : deadline})
    return (await response.json()) as Target[]
  } catch (error) {
    currentSignal()?.throwIfAborted()
    if (error instanceof Error && error.name === 'TimeoutError') throw new ReadTimeout(`no answer from the target list in ${timeout}s`, {cause: error})
    throw error
  }
}

let currentUrl = ''

export function setCurrentUrl(url: string): void {
  currentUrl = url
}

/** Evaluate in the page. Chrome's DevTools socket sometimes drops a connection, so retry on a fresh one. */
export async function cdpEval(expression: string): Promise<unknown> {
  let last: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await tracked(`cdp ${expression.slice(0, 40)}`, () => cdpEvalOnce(expression))
    } catch (error) {
      // Timeouts, dropped sockets and a target list that is not JSON are retried. A missing target, a
      // protocol error or an exception in the page fails at once.
      if (error instanceof NoTargetError || error instanceof ProtocolError || error instanceof PageExceptionError) throw error
      last = error
      phase(`cdp dropped (${attempt + 1}): ${errorRepr(error)}, retrying`)
      await sleep(1.5)
      try {
        await adb(['forward', `tcp:${CDP_PORT}`, 'localabstract:chrome_devtools_remote'])
      } catch {}
    }
  }
  throw last
}

async function cdpEvalOnce(expression: string): Promise<unknown> {
  // Match the whole URL. An empty `prefix=` is a prefix of every other prefix, so a tab Chrome restored from an
  // earlier test would otherwise match.
  const page = (await targets(10)).find((target) => target.type === 'page' && target.url === currentUrl)
  if (!page?.webSocketDebuggerUrl) throw new NoTargetError(`no page target for ${currentUrl}`)
  // Chrome names itself localhost in the socket URL. Keep the path and talk to the forwarded IPv4 port.
  const url = new URL(page.webSocketDebuggerUrl)
  url.host = `127.0.0.1:${CDP_PORT}`
  // The global WebSocket sends no Origin header, so Chrome accepts it without --remote-allow-origins.
  const signal = currentSignal()
  signal?.throwIfAborted()
  const socket = new WebSocket(url)
  return await new Promise<unknown>((resolve, reject) => {
    let settled = false
    const onAbort = () => finish(signal!.reason)
    const finish = (error: Error | undefined, value?: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      socket.close()
      if (error) reject(error)
      else resolve(value)
    }
    const timer = setTimeout(() => finish(new WebSocketError('timed out after 10s')), 10_000)
    signal?.addEventListener('abort', onAbort, {once: true})
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression, returnByValue: true}}))
    })
    socket.addEventListener('message', (event) => {
      let message: {
        id?: number
        result?: {result?: {value?: unknown}; exceptionDetails?: {text?: string; exception?: {description?: string}}}
        error?: unknown
      }
      try {
        message = JSON.parse(String(event.data))
      } catch (error) {
        finish(new WebSocketError(`bad frame: ${errorRepr(error)}`))
        return
      }
      if (message.id !== 1) return
      const exception = message.result?.exceptionDetails
      if (exception) {
        const description = exception.exception?.description ?? 'no description'
        finish(new PageExceptionError(`${exception.text ?? 'Uncaught'} in \`${expression.slice(0, 60)}\`: ${description}`))
      } else if (!message.result?.result) finish(new ProtocolError(JSON.stringify(message.error ?? message)))
      else finish(undefined, message.result.result.value)
    })
    socket.addEventListener('error', () => finish(new WebSocketError('connection error')))
    socket.addEventListener('close', (event) => finish(new WebSocketError(`closed before a reply, code ${event.code}`)))
  })
}
