import {appendFileSync} from 'node:fs'
import {vi} from 'vitest'

const captured = process.env.THUMBJAR_CAPTURED_STDERR
if (captured !== undefined) {
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    appendFileSync(captured, `${args.map(String).join(' ')}\n`)
  })
}
