Feature: Lists

  Background:
    Given one editor

  Scenario: Clearing list item on Enter
    Given the text ">#:foo|>#:"
    When the editor is focused
    And the caret is put after ""
    And "{Enter}" is pressed
    And "bar" is typed
    Then the text is ">#:foo|bar"

  Scenario: Indenting list item on Tab
    Given the text ">#:foo|>#:"
    When the editor is focused
    And the caret is put after ""
    And "{Tab}" is pressed
    And "bar" is typed
    Then the text is ">#:foo|>>#:bar"

  Scenario: Unindenting list item on Shift+Tab
    Given the text ">#:foo|>>#:bar"
    When the editor is focused
    And the caret is put before "bar"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the text is ">#:foo|>#:bar"

  Scenario: Pressing Delete in an empty list item
    Given the text ">#:f|h1:bar"
    When the editor is focused
    And the caret is put before "f"
    And "{Delete}" is pressed 2 times
    Then the text is ">#h1:bar"

  Scenario: Pressing Backspace in an empty list item
    Given the text ">#:"
    When the editor is focused
    And the caret is put after ""
    And "{Backspace}" is pressed
    Then the text is ""

  Scenario: Pressing Backspace in an empty list item after a block object
    Given the text "{image}|>#:"
    When the editor is focused
    And the caret is put after ""
    And "{Backspace}" is pressed
    Then the text is "{image}|"

  Scenario Outline: Pressing Backspace after an empty list item
    When the editor is focused
    Given the text <text>
    When the caret is put <caret position>
    And "{Backspace}" is pressed
    Then the text is <new text>

    Examples:
      | text                  | caret position | new text             |
      | ">#:\|h1:foo"         | before "foo"   | ">#h1:foo"           |
      | ">#:foo\|>#:\|>#:bar" | after "bar"    | ">#:foo\|>#:\|>#:ba" |

  Scenario: Inserting indented numbered list in empty text block
    Given the text ""
    When ">#:foo|>>#:bar|>>>#:baz" is inserted at "auto"
    Then the text is ">#:foo|>>#:bar|>>>#:baz"

  Scenario Outline: Inserting list on list item
    Given the text <text>
    When the caret is put <position>
    And <blocks> is inserted at "auto"
    Then the text is <new text>

    Examples:
      | text     | position    | blocks                    | new text                     |
      | ">#:"    | after ""    | ">#:foo\|>#:bar\|>#:baz"  | ">#:foo\|>#:bar\|>#:baz"     |
      | ">#:"    | after ""    | ">-:foo\|>-:bar\|>-:baz"  | ">-:foo\|>-:bar\|>-:baz"     |
      | ">#:foo" | after "foo" | ">#:foo\|>#:bar\|>#:baz"  | ">#:foofoo\|>#:bar\|>#:baz"  |
      | ">#:foo" | after "foo" | ">-:foo\|>-:bar\|>-:baz"  | ">#:foofoo\|>#:bar\|>#:baz"  |
      | ">#:foo" | after "foo" | ">-:foo\|>>#:bar\|>-:baz" | ">#:foofoo\|>>#:bar\|>#:baz" |
      | ">#:foo" | after "foo" | ">-:foo\|>>-:bar\|>-:baz" | ">#:foofoo\|>>-:bar\|>#:baz" |

  Scenario Outline: Inserting lower-level list on list item
    Given the text ">>#:"
    When the caret is put after ""
    And ">#:foo|>#:bar|>#:baz" is inserted at "auto"
    Then the text is ">>#:foo|>>#:bar|>>#:baz"

  Scenario: Inserting different lower-level list type on list item
    Given the text ">>#:"
    When the caret is put after ""
    And ">-:foo|>-:bar|>-:baz" is inserted at "auto"
    Then the text is ">>-:foo|>>-:bar|>>-:baz"

  Scenario: Inserting inverse-indented list on list item
    Given the text ">>#:"
    When the caret is put after ""
    And ">>-:foo|>-:bar|>>-:baz" is inserted at "auto"
    Then the text is ">>-:foo|>-:bar|>>-:baz"

  Scenario: Inserting lower-level inverse-indented list on list item
    Given the text ">>>#:"
    When the caret is put after ""
    And ">>-:foo|>-:bar|>>-:baz" is inserted at "auto"
    Then the text is ">>>-:foo|>>-:bar|>>>-:baz"

  Scenario: Inserting lower-level, indented list on list item
    Given the text ">>#:"
    When the caret is put after ""
    And ">#:foo|>>#:bar|>>>#:baz" is inserted at "auto"
    Then the text is ">>#:foo|>>>#:bar|>>>>#:baz"

  Scenario: Inserting list that will exceed the maximum level (10)
    Given the text ">>>>>>>>>#:"
    When the caret is put after ""
    And ">#:foo|>>#:bar|>>>#:baz" is inserted at "auto"
    Then the text is ">>>>>>>>>#:foo|>>>>>>>>>>#:bar|>>>>>>>>>>#:baz"

  Scenario: Inserting list that exceeds the maximum level (10)
    Given the text ">>>>>>>>>#:"
    When the caret is put after ""
    And ">>>>>>>>>>>#:foo|>>>>>>>>>>>>#:bar|>>>>>>>>>>>>>#:baz" is inserted at "auto"
    Then the text is ">>>>>>>>>#:foo|>>>>>>>>>>#:bar|>>>>>>>>>>#:baz"

  Scenario: Inserting mixed blocks starting with a list item
    Given the text ">>-:"
    When the caret is put after ""
    And ">#:foo|{image}|>>#:baz" is inserted at "auto"
    Then the text is ">>#:foo|{image}|>>#:baz"

  Scenario: Inserting mixed blocks not starting with a list item
    Given the text ">>-:"
    When the caret is put after ""
    And "foo|>#:bar|>>#:baz" is inserted at "auto"
    Then the text is ">>-:foo|>>#:bar|>>>#:baz"

  Scenario: Inserting mixed blocks not starting with list items
    Given the text ">>-:"
    When the caret is put after ""
    And "foo|bar|>#:baz" is inserted at "auto"
    Then the text is ">>-:foo|bar|>#:baz"

  Scenario Outline: Inserting two lists preceded by a paragraph
    Given the text <text>
    When the caret is put after ""
    And <blocks> is inserted at "auto"
    Then the text is <new text>

    Examples:
      | text   | blocks                                | new text                                    |
      | ">>-:" | "foo\|>-:bar\|>>-:baz\|fizz\|>-:buzz" | ">>-:foo\|>>-:bar\|>>>-:baz\|fizz\|>-:buzz" |
      | ">>-:" | "foo\|>#:bar\|>>#:baz\|fizz\|>#:buzz" | ">>-:foo\|>>#:bar\|>>>#:baz\|fizz\|>#:buzz" |
      | ">>#:" | "foo\|>#:bar\|>>#:baz\|fizz\|>#:buzz" | ">>#:foo\|>>#:bar\|>>>#:baz\|fizz\|>#:buzz" |
      | ">>#:" | "foo\|>-:bar\|>>-:baz\|fizz\|>-:buzz" | ">>#:foo\|>>-:bar\|>>>-:baz\|fizz\|>-:buzz" |

  Scenario: Inserting heading on empty list item
    Given the text ">-:"
    When the caret is put after ""
    And "h1:foo" is inserted at "auto"
    Then the text is ">-h1:foo"

  Scenario: Inserting heading on non-empty list item
    Given the text ">-:foo"
    When the caret is put before "foo"
    And "h1:bar" is inserted at "auto"
    Then the text is ">-:barfoo"

  Scenario: Inserting image on empty list item
    Given the text ">-:"
    When the caret is put after ""
    And "{image}" is inserted at "auto"
    Then the text is "{image}"

  Scenario Outline: Deleting list
    Given the text <text>
    When the editor is focused
    And <selection> is selected
    And "{Backspace}" is pressed
    Then the text is <new text>

    Examples:
      | text                        | selection   | new text |
      | ">#:foo\|>>#:bar\|>>>#:baz" | "foobarbaz" | ">#:"    |
      | ">#:foo\|>>#:bar\|>>>#:baz" | "oobarbaz"  | ">#:f"   |
      | ">#:foo\|>>#:bar\|>>>#:baz" | "oobarba"   | ">#:fz"  |
      | ">#:foo\|>>#:bar\|>>>#:baz" | "foobarba"  | ">#:z"   |

  Scenario: Undo after deleting list
    Given the text ">#:foo|>>#:bar"
    When the editor is focused
    And "fooba" is selected
    And "{Backspace}" is pressed
    Then the text is ">#:r"
    When undo is performed
    Then the text is ">#:foo|>>#:bar"
