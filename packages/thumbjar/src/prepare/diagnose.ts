import {appendFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {DIAGNOSTICS_SECONDS, COMMAND_KILL_SECONDS} from '../device/budget.ts'
import {execute} from '../process.ts'

export async function diagnose(out: string, signal: AbortSignal) {
  const file = join(out, 'diagnose.txt')
  writeFileSync(file, '')
  const print = (text: string) => {
    appendFileSync(file, text)
    process.stdout.write(text)
  }
  const adb = async (
    args: string[],
    filter?: (text: string) => string,
    merge = false,
  ) => {
    const result = await execute('adb', args, {
      seconds: DIAGNOSTICS_SECONDS,
      killAfter: COMMAND_KILL_SECONDS,
      signal,
      merge,
      ...(filter ? {} : {stdout: (chunk) => print(chunk.toString())}),
      stderr: (chunk) => {
        if (!merge) {
          print(chunk.toString())
        }
      },
    })
    if (filter) {
      print(filter(result.stdout))
    }
  }
  print('== build\n')
  await adb(['shell', 'getprop', 'ro.build.fingerprint'])
  await adb(['shell', 'getprop', 'ro.build.version.sdk'])
  print('== locale\n')
  await adb(['shell', 'getprop', 'persist.sys.locale'])
  await adb(['shell', 'settings', 'get', 'system', 'system_locales'])
  print('== ime list -s\n')
  await adb(['shell', 'ime', 'list', '-s'])
  print('== default_input_method\n')
  await adb(['shell', 'settings', 'get', 'secure', 'default_input_method'])
  print('== enabled_input_methods\n')
  await adb(['shell', 'settings', 'get', 'secure', 'enabled_input_methods'])
  print('== gboard\n')
  await adb(
    ['shell', 'dumpsys', 'package', 'com.google.android.inputmethod.latin'],
    (text) => lines(text, /versionName|versionCode/, 2),
  )
  print('== chrome\n')
  await adb(['shell', 'dumpsys', 'package', 'com.android.chrome'], (text) =>
    lines(text, /versionName/, 1),
  )
  print('== gboard subtypes\n')
  await adb(['shell', 'dumpsys', 'input_method'], (text) =>
    lines(text, /subtype|mCurrentSubtype|ja/i, 40),
  )
  print('== adb root\n')
  await adb(
    ['root'],
    (text) =>
      text.slice(
        0,
        text.indexOf('\n') === -1 ? text.length : text.indexOf('\n') + 1,
      ),
    true,
  )
}

function lines(text: string, pattern: RegExp, count: number) {
  const selected = text
    .split('\n')
    .filter((line) => pattern.test(line))
    .slice(0, count)
  return selected.length ? `${selected.join('\n')}\n` : ''
}
