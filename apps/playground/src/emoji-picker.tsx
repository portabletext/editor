import {useEffect, useRef} from 'react'
import type {EmojiMatch} from './emoji-search'

export function EmojiListBox(props: {
  matches: Array<EmojiMatch>
  selectedIndex: number
}) {
  return (
    <ol style={{maxHeight: 200, overflowY: 'auto'}}>
      {props.matches.map((match, index) => (
        <EmojiListItem
          key={
            match.type === 'exact'
              ? `${match.emoji}-${match.keyword}`
              : `${match.emoji}-${match.startSlice}${match.keyword}${match.endSlice}`
          }
          match={match}
          selected={props.selectedIndex === index}
        />
      ))}
    </ol>
  )
}

function EmojiListItem(props: {match: EmojiMatch; selected: boolean}) {
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (props.selected && ref.current) {
      ref.current.scrollIntoView({behavior: 'smooth', block: 'nearest'})
    }
  }, [props.selected])

  if (props.match.type === 'exact') {
    return (
      <li
        ref={ref}
        style={{
          background: props.selected ? 'lightblue' : 'unset',
        }}
      >
        <span>{props.match.emoji} :</span>
        <span style={{background: 'yellow'}}>{props.match.keyword}</span>:
      </li>
    )
  }

  return (
    <li
      ref={ref}
      style={{
        background: props.selected ? 'lightblue' : 'unset',
      }}
    >
      <span>{props.match.emoji} :</span>
      {props.match.startSlice}
      <span style={{background: 'yellow'}}>{props.match.keyword}</span>
      {props.match.endSlice}:
    </li>
  )
}
