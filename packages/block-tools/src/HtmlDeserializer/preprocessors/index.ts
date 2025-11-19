import preprocessGDocs from './gdocs'
import preprocessHTML from './html'
import preprocessNotion from './notion'
import {preprocessWordOnline} from './preprocessor.word-online'
import preprocessWhitespace from './whitespace'
import preprocessWord from './word'

export default [
  preprocessWhitespace,
  preprocessNotion,
  preprocessWord,
  preprocessWordOnline,
  preprocessGDocs,
  preprocessHTML,
]
