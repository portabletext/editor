#!/usr/bin/env node
// The `thumbjar` command. The library never boots the emulator: run these against one that is booted,
// apart from `fetch-u2-jar`, which needs no device.

import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'
import {localhostPort} from './device/page-url.ts'

const USAGE = `Usage:
  thumbjar fetch-u2-jar
      Download the uiautomator2 server jar and check its hash, before the emulator boots.
  thumbjar serve <dir> [--port 8765]
      Serve a built page directory over HTTP, one log line per request.
  thumbjar prepare --keyboard ja|en --page-url <url> [--out-dir out]
      Prepare a booted emulator: wait out the post-boot ANR storm, set up Chrome and Gboard, add the
      Japanese layout for \`--keyboard ja\`, check that <url> answers and reverse its port to the device
      when it is on localhost.`

const [command, ...rest] = process.argv.slice(2)

if (command === 'fetch-u2-jar') {
  await import('./prepare/fetch-u2-jar.ts')
} else if (command === 'serve') {
  const {values, positionals} = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {port: {type: 'string', default: '8765'}},
  })
  if (positionals.length !== 1) {
    usage()
  }
  process.argv = [process.argv[0]!, 'serve', positionals[0]!, values.port]
  await import('./prepare/serve.ts')
} else if (command === 'prepare') {
  const {values} = parseArgs({
    args: rest,
    options: {
      'keyboard': {type: 'string'},
      'page-url': {type: 'string'},
      'out-dir': {type: 'string', default: 'out'},
    },
  })
  if (
    (values.keyboard !== 'ja' && values.keyboard !== 'en') ||
    values['page-url'] === undefined
  ) {
    usage()
  }
  const result = spawnSync(
    fileURLToPath(new URL('prepare/prepare.sh', import.meta.url)),
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        THUMBJAR_KEYBOARD: values.keyboard,
        THUMBJAR_PAGE_URL: values['page-url'],
        THUMBJAR_PAGE_PORT: localhostPort(values['page-url']) ?? '',
        THUMBJAR_OUT_DIR: values['out-dir'],
      },
    },
  )
  process.exit(result.status ?? 1)
} else {
  usage()
}

function usage(): never {
  console.error(USAGE)
  process.exit(2)
}
