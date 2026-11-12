// Download the uiautomator2 server jar into .cache before the emulator boots, so no test pays for it.

import {U2_JAR_ATTEMPTS, U2_JAR_RETRY_SECONDS} from '../device/budget.ts'
import {ensureJar} from '../device/u2-jar.ts'
import {errorRepr, sleep} from '../device/util.ts'

for (let attempt = 1; ; attempt++) {
  try {
    const {path, downloaded} = await ensureJar()
    process.stdout.write(
      downloaded
        ? `u2.jar downloaded to ${path}\n`
        : `u2.jar already at ${path} with its pinned hash, not downloaded\n`,
    )
    break
  } catch (error) {
    if (attempt >= U2_JAR_ATTEMPTS) {
      throw error
    }
    process.stdout.write(
      `u2.jar download failed (${attempt}): ${errorRepr(error)}, retrying\n`,
    )
    // Backs off before the next download. A failed download leaves nothing to poll.
    await sleep(U2_JAR_RETRY_SECONDS)
  }
}
