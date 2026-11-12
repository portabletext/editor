#!/usr/bin/env node
// The `thumbjar` command. The library never boots the emulator: run these against one that is booted,
// apart from `fetch-u2-jar`, which needs no device.

import {spawn, spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'
import {localhostPort} from './device/page-url.ts'

const USAGE = `Usage:
  thumbjar fetch-u2-jar
      Download the uiautomator2 server jar unless .cache already holds it with its pinned hash, and check its hash,
      before the emulator boots.
  thumbjar serve <dir> [--port 8765]
      Serve a built page directory over HTTP, one log line per request.
  thumbjar run <file> --keyboard ja|en --page-dir <dir> --config <vitest config> --project <name> [--port 8765] [--out-dir out]
      Serve the page, prepare a booted device, run one test file under its cap and collect diagnostics.
  thumbjar prepare --keyboard ja|en --page-url <url> [--out-dir out] [--booted <epoch seconds>]
      Prepare a booted emulator: keep Play Store from updating apps, wait out the post-boot ANR storm,
      set up Chrome and Gboard, add the Japanese layout for \`--keyboard ja\` and wait until Gboard has
      loaded its Japanese dictionary, at most 360 seconds after --booted, when the emulator came online,
      or after the prep started without it, check that <url> answers and reverse its port to the device
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
} else if (command === 'run') {
  const {values, positionals} = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      'keyboard': {type: 'string'},
      'page-dir': {type: 'string'},
      'config': {type: 'string'},
      'project': {type: 'string'},
      'port': {type: 'string', default: '8765'},
      'out-dir': {type: 'string', default: 'out'},
    },
  })
  if (
    positionals.length !== 1 ||
    (values.keyboard !== 'ja' && values.keyboard !== 'en') ||
    !values['page-dir'] ||
    !values.config ||
    !values.project ||
    !/^\d+$/.test(values.port) ||
    Number(values.port) < 1 ||
    Number(values.port) > 65535
  ) {
    usage()
  }
  const script = spawn(
    'bash',
    [
      fileURLToPath(new URL('run/run.sh', import.meta.url)),
      positionals[0]!,
      values.keyboard,
      values['page-dir'],
      values.config,
      values.project,
      values.port,
      values['out-dir'],
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        THUMBJAR_RUN_CAP: fileURLToPath(
          new URL(
            import.meta.url.endsWith('.ts') ? 'run/cap.ts' : 'run/cap.js',
            import.meta.url,
          ),
        ),
        THUMBJAR_RUN_CHECK: fileURLToPath(
          new URL(
            import.meta.url.endsWith('.ts') ? 'run/check.ts' : 'run/check.js',
            import.meta.url,
          ),
        ),
      },
    },
  )
  // A signal to this process stops the script too, as it would a script the step ran itself.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => {
      script.kill(signal)
    })
  }
  script.on('exit', (status) => {
    process.exit(status ?? 1)
  })
} else if (command === 'prepare') {
  const {values} = parseArgs({
    args: rest,
    options: {
      'keyboard': {type: 'string'},
      'page-url': {type: 'string'},
      'out-dir': {type: 'string', default: 'out'},
      'booted': {type: 'string'},
    },
  })
  if (
    (values.keyboard !== 'ja' && values.keyboard !== 'en') ||
    values['page-url'] === undefined ||
    (values.booted !== undefined && !/^\d+$/.test(values.booted))
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
        THUMBJAR_BOOTED: values.booted ?? String(Math.floor(Date.now() / 1000)),
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
