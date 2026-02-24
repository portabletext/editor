import {preprocessWordOnline} from '../word-online/preprocessor.word-online'
import {preprocessGDocs} from './preprocessor.gdocs'
import {preprocessHTML} from './preprocessor.html'
import {preprocessNotion} from './preprocessor.notion'
import {preprocessWhitespace} from './preprocessor.whitespace'
import {preprocessWord} from './preprocessor.word'

export const preprocessors = [
  preprocessWhitespace,
  preprocessNotion,
  preprocessWord,
  preprocessWordOnline,
  preprocessGDocs,
  preprocessHTML,
]
