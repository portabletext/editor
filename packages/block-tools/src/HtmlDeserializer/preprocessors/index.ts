import preprocessGDocs from './gdocs'
import preprocessHTML from './html'
import preprocessNotion from './notion'
import preprocessWhitespace from './whitespace'
import preprocessWord from './word'
import preprocessWordOnline from './word-online'

export default [
  preprocessWhitespace,
  preprocessNotion,
  preprocessWord,
  preprocessWordOnline,
  preprocessGDocs,
  preprocessHTML,
]
