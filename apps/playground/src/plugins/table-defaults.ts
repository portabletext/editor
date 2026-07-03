/**
 * The fields of a freshly inserted table: 3x3 with one header row, matching
 * the design prototype's insert. Used by both the toolbar button and the
 * slash command.
 */
export function defaultTableValue() {
  return {
    headerRows: 1,
    rows: Array.from({length: 3}, () => ({
      _type: 'row',
      cells: Array.from({length: 3}, () => ({
        _type: 'cell',
        value: [
          {
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', text: '', marks: []}],
          },
        ],
      })),
    })),
  }
}
