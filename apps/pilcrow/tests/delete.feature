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
    Given the editor state is "B: "
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
