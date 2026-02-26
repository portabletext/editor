import {preprocessWordOnline} from './word-online'
import {preprocessGDocs} from './gdocs'
import {preprocessHTML} from './html'
import {preprocessNotion} from './notion'
import {preprocessWhitespace} from './whitespace'
import {preprocessWord} from './word'

export const preprocessors = [
  preprocessWhitespace,
  preprocessNotion,
  preprocessWord,
  preprocessWordOnline,
  preprocessGDocs,
  preprocessHTML,
]
