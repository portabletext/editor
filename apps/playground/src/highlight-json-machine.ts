import prettierPluginBabel from 'prettier/plugins/babel'
import prettierPluginEstree from 'prettier/plugins/estree'
import prettierPluginHtml from 'prettier/plugins/html'
import * as prettier from 'prettier/standalone'
import {codeToHtml} from 'shiki/bundle/web'
import {assign, fromPromise, setup} from 'xstate'

function formatJson(json: string) {
  return prettier.format(json, {
    parser: 'json',
    plugins: [prettierPluginBabel, prettierPluginEstree, prettierPluginHtml],
  })
}

function highlightJson(json: string) {
  return codeToHtml(json, {lang: 'json', theme: 'github-light'})
}

const highlightLogic = fromPromise<string, {code: string}>(({input}) =>
  formatJson(input.code).then(highlightJson),
)

export const highlightMachine = setup({
  types: {
    context: {} as {
      code: string
      pendingCode?: string
      highlightedCode?: string
    },
    events: {} as {type: 'update code'; code: string},
    input: {} as {code: string},
  },
  actions: {
    'assign code to context': assign({
      code: ({event}) => event.code,
    }),
  },
  actors: {
    'highlight code': highlightLogic,
  },
}).createMachine({
  id: 'highlight',
  context: ({input}) => ({
    code: input.code,
    pendingCode: input.code,
  }),
  initial: 'highlighting code',
  states: {
    'idle': {
      on: {
        'update code': {
          actions: assign({pendingCode: ({event}) => event.code}),
          target: '.',
          reenter: true,
        },
      },
      after: {
        250: {
          guard: ({context}) => context.pendingCode !== undefined,
          target: 'highlighting code',
          actions: assign({
            code: ({context}) => context.pendingCode ?? '',
            pendingCode: undefined,
          }),
        },
      },
    },
    'highlighting code': {
      invoke: {
        src: 'highlight code',
        input: ({context}) => ({code: context.code}),
        onDone: {
          target: 'idle',
          actions: [assign({highlightedCode: ({event}) => event.output})],
        },
        onError: {
          target: 'idle',
          actions: [({event}) => console.error(event.error)],
        },
      },
      on: {
        'update code': {
          actions: assign({pendingCode: ({event}) => event.code}),
        },
      },
    },
  },
})
