import {request as httpRequest} from 'node:http'
import {request as httpsRequest} from 'node:https'
import {setTimeout as delay} from 'node:timers/promises'
import {
  HTTP_ATTEMPTS,
  HTTP_ATTEMPT_SECONDS,
  HTTP_RETRY_SECONDS,
} from '../device/budget.ts'

export async function httpReady(
  url: string,
  signal: AbortSignal,
): Promise<boolean> {
  for (let attempt = 1; attempt <= HTTP_ATTEMPTS; attempt++) {
    const deadline = AbortSignal.timeout(HTTP_ATTEMPT_SECONDS * 1000)
    const result = await new Promise<{ready: boolean; retry: boolean}>(
      (resolve) => {
        const request = (
          new URL(url).protocol === 'https:' ? httpsRequest : httpRequest
        )(
          url,
          {
            signal: AbortSignal.any([signal, deadline]),
          },
          (response) => {
            const status = response.statusCode ?? 0
            if (status >= 400) {
              response.destroy()
              resolve({
                ready: false,
                retry: [408, 429, 500, 502, 503, 504].includes(status),
              })
              return
            }
            response.resume()
            response.on('end', () =>
              resolve({
                ready: status < 400,
                retry: [408, 429, 500, 502, 503, 504].includes(status),
              }),
            )
            response.on('error', () =>
              resolve({ready: false, retry: deadline.aborted}),
            )
          },
        )
        request.on('error', (error) =>
          resolve({
            ready: false,
            retry:
              deadline.aborted ||
              ('code' in error && error.code === 'ECONNREFUSED'),
          }),
        )
        request.end()
      },
    )
    signal.throwIfAborted()
    if (result.ready) {
      return true
    }
    if (!result.retry || attempt === HTTP_ATTEMPTS) {
      return false
    }
    await delay(HTTP_RETRY_SECONDS * 1000, undefined, {signal})
  }
  return false
}
