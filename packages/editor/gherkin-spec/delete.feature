Feature: Delete

  Background:
    Given one editor

  Scenario Outline: Deleting expanded selection
    Given the editor state is <text>
    When the editor is focused
    And <selection> is selected
    And "{Delete}" is pressed
    And "new" is typed
    Then the editor state is <new text>

    Examples:
      | text                     | selection | new text           |
      | "B: foo;;B: bar"         | "foo"     | "B: new\|;;B: bar" |
      | "B: foo;;B: bar;;B: baz" | "foobar"  | "B: new\|;;B: baz" |

  Scenario Outline: Deleting word
    Given the editor state is <text>
    When the editor is focused
    And the caret is put <position>
    And <shortcut> is pressed
    Then the editor state is <final text>

    Examples:
      | text             | position        | shortcut              | final text       |
      | "B: foo bar baz" | after "bar"     | "deleteWord.backward" | "B: foo \| baz"  |
      | "B: foo bar baz" | after "bar "    | "deleteWord.backward" | "B: foo \|baz"   |
      | "B: foo bar baz" | after "foo ba"  | "deleteWord.backward" | "B: foo \|r baz" |
      | "B: foo bar baz" | before "bar"    | "deleteWord.forward"  | "B: foo \| baz"  |
      | "B: foo bar baz" | before " bar"   | "deleteWord.forward"  | "B: foo\| baz"   |
      | "B: foo bar baz" | before "ar baz" | "deleteWord.forward"  | "B: foo b\| baz" |

  Scenario Outline: Deleting code points in complex scripts
    Given the editor state is <text>
    When the editor is focused
    And the caret is put after <orig>
    And "{Backspace}" is pressed
    Then the editor state is <final text>

    Examples:
      # Hindi (Devanagari) - "कि" is क (ka) + ि (vowel i), two code points
      | text    | orig | final text |
      | "B: कि" | "कि" | "B: क\|"   |
      # Bengali - "কি" is ক (ka) + ি (vowel i)
      | "B: কি" | "কি" | "B: ক\|"   |
      # Thai - "กิ" is ก (ko kai) + ิ (sara i)
      | "B: กิ" | "กิ" | "B: ก\|"   |

  Scenario Outline: Deleting line backward
    Given the editor state is <text>
    When the editor is focused
    And the caret is put <position>
    And "deleteLine.backward" is pressed
    Then the editor state is <final text>
    When undo is performed
    Then the editor state is <undone>

    Examples:
      | text             | position     | final text     | undone             |
      | "B: foo bar baz" | after "bar"  | "B: \| baz"    | "B: foo bar\| baz" |
      | "B: foo bar baz" | after "baz"  | "B: \|"        | "B: foo bar baz\|" |
      | "B: foo bar baz" | after "foo " | "B: \|bar baz" | "B: foo \|bar baz" |

  Scenario: Deleting line backward at start of block merges blocks
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And the caret is put before "bar"
    And "deleteLine.backward" is pressed
    Then the editor state is "B: foo|bar"
    When undo is performed
    Then the editor state is
      """
      B: foo
      B: |bar
      """

  Scenario: Cutting selected text
    Given the editor state is "B: foo bar baz"
    When the editor is focused
    And "bar" is selected
    And cut is performed
    Then the editor state is "B: foo | baz"
    When undo is performed
    Then the editor state is "B: foo ^bar| baz"

  Scenario: Cutting across blocks
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And "foobar" is selected
    And cut is performed
    Then the editor state is "B: |"
    When undo is performed
    Then the editor state is
      """
      B: ^foo
      B: bar|
      """

  Scenario: Deleting word backward at block boundary merges blocks
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And the caret is put before "bar"
    And "deleteWord.backward" is pressed
    Then the editor state is "B: foo|bar"
    When undo is performed
    Then the editor state is
      """
      B: foo
      B: |bar
      """

  Scenario: Deleting word forward at block boundary merges blocks
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And the caret is put after "foo"
    And "deleteWord.forward" is pressed
    Then the editor state is "B: foo|bar"
    When undo is performed
    Then the editor state is
      """
      B: foo|
      B: bar
      """

  Scenario: Cutting with collapsed selection is a no-op
    Given the editor state is "B: foo bar baz"
    When the editor is focused
    And the caret is put after "bar"
    And cut is performed
    Then the editor state is "B: foo bar| baz"

  Scenario: Deleting line backward in empty block
    Given the editor state is "B:"
    When the editor is focused
    And "deleteLine.backward" is pressed
    Then the editor state is "B: |"

  Scenario: Deleting line backward only affects current block
    Given the editor state is
      """
      B: foo
      B: bar baz
      """
    When the editor is focused
    And the caret is put after "bar"
    And "deleteLine.backward" is pressed
    Then the editor state is
      """
      B: foo
      B: | baz
      """
    When undo is performed
    Then the editor state is
      """
      B: foo
      B: bar| baz
      """

  Scenario Outline: Merging blocks preserves marks
    Given the editor state is
      """
      B: foo
      B: bar
      """
    And "strong" around "bar"
    When the editor is focused
    And the caret is put <position>
    And <button> is pressed
    Then the editor state is <text>

    Examples:
      | position     | button        | text                   |
      | before "bar" | "{Backspace}" | "B: foo[strong:\|bar]" |
      | after "foo"  | "{Delete}"    | "B: foo\|[strong:bar]" |

  Scenario Outline: Merging blocks triggers span normalization
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And the caret is put <position>
    And <button> is pressed
    Then the editor state is "B: foo|bar"

    Examples:
      | position     | button        |
      | before "bar" | "{Backspace}" |
      | after "foo"  | "{Delete}"    |

  Scenario: Deleting backward at the start of an empty text block after a void block-object focuses the block-object
    Given the editor state is
      """
      {IMAGE}
      B:
      """
    When the selection is
      """
      {IMAGE}
      B: |
      """
    And a backward character deletion is performed
    Then the editor state is
      """
      ^{IMAGE}|
      """

  Scenario: Deleting a word backward from a collapsed position removes the word before it
    Given the editor state is
      """
      B: foo bar baz
      """
    When the selection is cleared
    And text is deleted backward by word at the following range
      """
      B: foo bar| baz
      """
    Then the editor state is
      """
      B: foo  baz
      """
    And nothing is selected

  Scenario: Deleting a word backward from an expanded range removes only that range
    Given the editor state is
      """
      B: foo bar baz
      """
    When the selection is cleared
    And text is deleted backward by word at the following range
      """
      B: foo b^ar| baz
      """
    Then the editor state is
      """
      B: foo b baz
      """
    And nothing is selected

  Scenario: Deleting a line backward from a position removes the text before it
    Given the editor state is
      """
      B: foo bar baz
      """
    When the selection is cleared
    And text is deleted backward by line at the following range
      """
      B: foo |bar baz
      """
    Then the editor state is
      """
      B: bar baz
      """
    And nothing is selected

  Scenario: Deleting a line forward from a position removes the text after it
    Given the editor state is
      """
      B: foo bar baz
      """
    When the selection is cleared
    And text is deleted forward by line at the following range
      """
      B: foo bar| baz
      """
    Then the editor state is
      """
      B: foo bar
      """
    And nothing is selected

  Scenario: Deleting a line forward over an expanded selection removes the selection
    Given the editor state is
      """
      B: foo bar baz
      """
    When the selection is cleared
    And text is deleted forward by line at the following range
      """
      B: foo ^bar| baz
      """
    Then the editor state is
      """
      B: foo  baz
      """
    And nothing is selected

  Scenario: Deleting a line forward before an explicit newline removes the text up to the newline
    Given the editor state is "B: foo\nbar"
    When the selection is cleared
    And text is deleted forward by line at "B: f|oo\\nbar"
    Then the editor state is "B: f\nbar"
    And nothing is selected

  Scenario: Deleting a line forward directly before an explicit newline removes the newline
    Given the editor state is "B: foo\nbar"
    When the selection is cleared
    And text is deleted forward by line at "B: foo|\\nbar"
    Then the editor state is "B: foobar"
    And nothing is selected

  Scenario: Deleting a line forward across an inline object removes the text and the inline object up to the end of the line
    Given the editor state is
      """
      B: foo{stock-ticker}bar
      """
    When the selection is cleared
    And text is deleted forward by line at the following range
      """
      B: f|oo{stock-ticker}bar
      """
    Then the editor state is
      """
      B: f
      """
    And nothing is selected

  Scenario: Deleting an expanded range from one void to another removes the entire region between
    Given the editor state is
      """
      {IMAGE}
      B: foo
      {IMAGE}
      """
    When the selection is "^{IMAGE};;B: foo;;|{IMAGE}"
    And text is deleted
    Then the editor state is
      """
      B: |
      """

  Scenario: Deleting at the end of a block joins the next block, and deleting at a block object removes it
    Given the editor state is
      """
      B: foo
      B: bar
      {IMAGE}
      """
    When the selection is cleared
    Then the editor state is
      """
      B: foo
      B: bar
      {IMAGE}
      """
    And nothing is selected
    When text is deleted at the following range
      """
      B: foo|
      B: bar
      {IMAGE}
      """
    Then the editor state is
      """
      B: foobar
      {IMAGE}
      """
    And nothing is selected
    When text is deleted at block 2 offset 0 through block 2 offset 0
    Then the editor state is
      """
      B: foobar
      """
    And nothing is selected

  Scenario: Deleting from the first block to the last block empties the editor
    Given the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    When the selection is cleared
    Then the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    And nothing is selected
    When text is deleted at the following range
      """
      B: ^foo
      {IMAGE}
      B: bar|
      """
    Then the editor state is
      """
      B:
      """
    And nothing is selected

  Scenario: Deleting a selection that hangs around a block object removes the block object
    Given the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    When the selection is cleared
    Then the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    And nothing is selected
    When text is deleted at the following range
      """
      B: ^foo
      {IMAGE}
      B: |bar
      """
    Then the editor state is
      """
      B: bar
      """
    And nothing is selected

  Scenario: Deleting a backward selection that hangs around a block object removes the text and the object
    Given the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    When the selection is cleared
    Then the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    And nothing is selected
    When text is deleted at the following range in backward order
      """
      B: |foo
      {IMAGE}
      B: ^bar
      """
    Then the editor state is
      """
      B: bar
      """
    And nothing is selected

  Scenario: Deleting a range around a block object from the end of the first block keeps only the first block
    Given the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    When the selection is cleared
    Then the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    And nothing is selected
    When text is deleted at the following range
      """
      B: foo|
      {IMAGE}
      B: bar^
      """
    Then the editor state is
      """
      B: foo
      """
    And nothing is selected

  Scenario: Deleting at a location leaves an empty text block and no selection
    Given the editor state is
      """
      B: foo
      B: bar
      {IMAGE}
      B: baz
      """
    When the selection is cleared
    And text is deleted at block 3 offset 0 through block 1 offset 0 in backward order
    Then the editor state is
      """
      B:
      B: baz
      """
    And nothing is selected

  Scenario: Deleting without a trailing text block leaves an empty text block
    Given the editor state is
      """
      B: foo
      B: bar
      {IMAGE}
      """
    When the selection is cleared
    And text is deleted at block 3 offset 0 through block 1 offset 0 in backward order
    Then the editor state is
      """
      B:
      """
    And nothing is selected

  Scenario: Deleting block offset
    Given the editor state is
      """
      B: foo[strong:bar]baz
      B: fizz[strong:buzz]
      """
    When the selection is cleared
    And text is deleted at block 2 offset 2 through block 2 offset 7
    Then the editor state is
      """
      B: foo[strong:bar]baz
      B: fi[strong:z]
      """
    And nothing is selected
    When text is deleted at block 1 offset 2 through block 1 offset 7
    Then the editor state is
      """
      B: foaz
      B: fi[strong:z]
      """
    And nothing is selected

  Scenario: Deleting multiple blocks
    Given the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      B: baz
      """
    When the selection is cleared
    And text is deleted by block at block 1 offset 0 through block 3 offset 0
    Then the editor state is
      """
      B: baz
      """
    And nothing is selected

  Scenario: Deleting without selection
    Given the editor state is
      """
      B: foo bar baz
      """
    When the selection is cleared
    And text is deleted at the following range
      """
      B: foo ^bar |baz
      """
    Then the editor state is
      """
      B: foo baz
      """
    And nothing is selected

  Scenario: Deleting an end-to-end selection removes all children
    Given the editor state is
      """
      B: foo{stock-ticker}bar
      """
    When the selection is cleared
    And text is deleted by child at the following range
      """
      B: ^foo{stock-ticker}bar|
      """
    Then the editor state is
      """
      B:
      """
    And nothing is selected

  Scenario: Deleting a mid-span to mid-span selection removes all touched children
    Given the editor state is
      """
      B: foo{stock-ticker}bar
      """
    When the selection is cleared
    And text is deleted by child at the following range
      """
      B: f^oo{stock-ticker}ba|r
      """
    Then the editor state is
      """
      B:
      """
    And nothing is selected

  Scenario: Deleting a partial span selection removes the whole span
    Given the editor state is
      """
      B: foo{stock-ticker}bar
      """
    When the selection is cleared
    And text is deleted by child at the following range
      """
      B: f^o|o{stock-ticker}bar
      """
    Then the editor state is
      """
      B: {stock-ticker}bar
      """
    And nothing is selected

  Scenario: Deleting before a block object preserves it
    Given the editor state is
      """
      {IMAGE}
      """
    When the selection is cleared
    And text is deleted by child at block 1 offset 0 through block 1 offset 0
    Then the editor state is
      """
      {IMAGE}
      """
    And nothing is selected

  Scenario: Deleting across block object
    Given the editor state is
      """
      B: foo
      {IMAGE}
      B: bar
      """
    When the selection is cleared
    And text is deleted by child at the following range
      """
      B: f^oo
      {IMAGE}
      B: ba|r
      """
    Then the editor state is
      """
      B:
      {IMAGE}
      B:
      """
    And nothing is selected

  Scenario: Delete backward uses at location instead of selection
    Given the editor state is
      """
      B: foo
      B: bar
      """
    When the editor is focused
    And the selection is
      """
      B: foo|
      B: bar
      """
    And text is deleted backward at the following range
      """
      B: foo
      B: |bar
      """
    Then the editor state is
      """
      B: foo|bar
      """

  Scenario: Deleting a range across two empty same-parent blocks
    Given the editor state is
      """
      B:
      B style="h1":
      """
    When the selection is cleared
    And text is deleted at the following range
      """
      B: ^
      B style="h1": |
      """
    Then the editor state is
      """
      B:
      """
    And nothing is selected

  Scenario: Deleting a range across three empty same-parent blocks
    Given the editor state is
      """
      B:
      B style="h1":
      B:
      """
    When the selection is cleared
    And text is deleted at "B: ^;;B style=\"h1\": ;;B: |"
    Then the editor state is
      """
      B:
      """
    And nothing is selected
