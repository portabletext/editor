// Download the uiautomator2 server jar into .cache before the emulator boots, so no test pays for it.

import {ensureJar} from '../device/u2.ts'
import {errorRepr, sleep} from '../device/util.ts'

for (let attempt = 1; ; attempt++) {
  try {
    process.stdout.write(`u2.jar ready at ${await ensureJar()}\n`)
    break
  } catch (error) {
    if (attempt >= 3) {
      throw error
    }
    process.stdout.write(
      `u2.jar download failed (${attempt}): ${errorRepr(error)}, retrying\n`,
    )
    // Backs off before the next download. A failed download leaves nothing to poll.
    await sleep(5)
  }
}
