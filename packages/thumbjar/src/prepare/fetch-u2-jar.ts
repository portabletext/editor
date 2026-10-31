// Download the uiautomator2 server jar into .cache before the emulator boots, so no test pays for it.

import {ensureJar} from './lib/u2.ts'
import {errorRepr, sleep} from './lib/util.ts'

for (let attempt = 1; ; attempt++) {
  try {
    console.log(`u2.jar ready at ${await ensureJar()}`)
    break
  } catch (error) {
    if (attempt >= 3) throw error
    console.log(
      `u2.jar download failed (${attempt}): ${errorRepr(error)}, retrying`,
    )
    // Backs off before the next download. A failed download leaves nothing to poll.
    await sleep(5)
  }
}
