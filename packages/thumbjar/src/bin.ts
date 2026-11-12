#!/usr/bin/env node
// The `thumbjar` command. The library never boots the emulator: run these against one that is booted,
// apart from `fetch-u2-jar`, which needs no device.

import {resolve} from 'node:path'
import {parseArgs} from 'node:util'
import {localhostPort} from './device/page-url.ts'

const USAGE = `Usage:
  thumbjar fetch-u2-jar
      Download the uiautomator2 server jar unless the calling package's cache already holds it with its pinned hash,
      and check its hash,
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
  const {run} = await import('./run/run.ts')
  process.exitCode = await run({
    file: positionals[0]!,
    keyboard: values.keyboard,
    pageDir: resolve(values['page-dir']),
    config: values.config,
    project: values.project,
    port: values.port,
    out: resolve(values['out-dir']),
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
  const {prepare} = await import('./prepare/prepare.ts')
  process.exitCode = await prepare({
    keyboard: values.keyboard,
    pageUrl: values['page-url'],
    port: localhostPort(values['page-url']) ?? '',
    out: resolve(values['out-dir']),
    booted: Number(values.booted ?? Math.floor(Date.now() / 1000)),
  })
} else {
  usage()
}

function usage(): never {
  console.error(USAGE)
  process.exit(2)
}
