import {afterAll} from 'vitest'
import {cdp, server} from 'vitest/browser'

afterAll(async () => {
  if (server.browser === 'chromium') {
    // Chromium leaks shared memory for every module request answered with
    // `304 Not Modified` until a forced GC (vitest-dev/vitest#9437). On long
    // CI runs the leak exhausts the runner disk and crashes the browser
    // mid-run. Delete this hook once Vitest ships the built-in GC trigger
    // (vitest-dev/vitest#10912).
    await cdp().send('HeapProfiler.collectGarbage')
  }
})
