Feature: Lists

  Background:
    Given one editor

  Scenario: Clearing list item on Enter
    Given the editor state is "B listItem=\"number\": foo;;B listItem=\"number\": "
    When the editor is focused
    And the caret is put after ""
    And "{Enter}" is pressed
    And "bar" is typed
    Then the editor state is
      """
      B listItem="number": foo
      B: bar|
      """

  Scenario: Indenting list item on Tab
    Given the editor state is "B listItem=\"number\": foo;;B listItem=\"number\": "
    When the editor is focused
    And the caret is put after ""
    And "{Tab}" is pressed
    And "bar" is typed
    Then the editor state is
      """
      B listItem="number": foo
      B level=2 listItem="number": bar|
      """

  Scenario: Unindenting list item on Shift+Tab
    Given the editor state is
      """
      B listItem="number": foo
      B level=2 listItem="number": bar
      """
    When the editor is focused
    And the caret is put before "bar"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the editor state is
      """
      B listItem="number": foo
      B listItem="number": |bar
      """

  Scenario: Pressing Delete in an empty list item
    Given the editor state is
      """
      B listItem="number": f
      B style="h1": bar
      """
    When the editor is focused
    And the caret is put before "f"
    And "{Delete}" is pressed 2 times
    Then the editor state is
      """
      B listItem="number" style="h1": |bar
      """

  Scenario: Pressing Backspace in an empty list item
    Given the editor state is "B listItem=\"number\": "
    When the editor is focused
    And the caret is put after ""
    And "{Backspace}" is pressed
    Then the editor state is "B: |"

  Scenario: Pressing Backspace in an empty list item after a block object
    Given the editor state is "{IMAGE};;B listItem=\"number\": "
    When the editor is focused
    And the caret is put after ""
    And "{Backspace}" is pressed
    Then the editor state is
      """
      {IMAGE}
      B: |
      """

  Scenario Outline: Pressing Backspace after an empty list item
    When the editor is focused
    Given the editor state is <text>
    When the caret is put <caret position>
    And "{Backspace}" is pressed
    Then the editor state is <new text>

    Examples:
      | text                                                                              | caret position | new text                                                                           |
      | "B listItem=\"number\": ;;B style=\"h1\": foo"                                    | before "foo"   | "B listItem=\"number\" style=\"h1\": \|foo"                                        |
      | "B listItem=\"number\": foo;;B listItem=\"number\": ;;B listItem=\"number\": bar" | after "bar"    | "B listItem=\"number\": foo;;B listItem=\"number\": ;;B listItem=\"number\": ba\|" |

  Scenario: Inserting indented numbered list in empty text block
    Given the editor state is "B: "
    When ">#:foo|>>#:bar|>>>#:baz" is inserted at "auto"
    Then the editor state is
      """
      B listItem="number": foo
      B level=2 listItem="number": bar
      B level=3 listItem="number": baz|
      """

  Scenario Outline: Inserting list on list item
    Given the editor state is <text>
    When the caret is put <position>
    And <blocks> is inserted at "auto"
    Then the editor state is <new text>

    Examples:
      | text                         | position    | blocks                    | new text                                                                                          |
      | "B listItem=\"number\": "    | after ""    | ">#:foo\|>#:bar\|>#:baz"  | "B listItem=\"number\": foo;;B listItem=\"number\": bar;;B listItem=\"number\": baz\|"            |
      | "B listItem=\"number\": "    | after ""    | ">-:foo\|>-:bar\|>-:baz"  | "B listItem=\"bullet\": foo;;B listItem=\"bullet\": bar;;B listItem=\"bullet\": baz\|"            |
      | "B listItem=\"number\": foo" | after "foo" | ">#:foo\|>#:bar\|>#:baz"  | "B listItem=\"number\": foofoo;;B listItem=\"number\": bar;;B listItem=\"number\": baz\|"         |
      | "B listItem=\"number\": foo" | after "foo" | ">-:foo\|>-:bar\|>-:baz"  | "B listItem=\"number\": foofoo;;B listItem=\"number\": bar;;B listItem=\"number\": baz\|"         |
      | "B listItem=\"number\": foo" | after "foo" | ">-:foo\|>>#:bar\|>-:baz" | "B listItem=\"number\": foofoo;;B level=2 listItem=\"number\": bar;;B listItem=\"number\": baz\|" |
      | "B listItem=\"number\": foo" | after "foo" | ">-:foo\|>>-:bar\|>-:baz" | "B listItem=\"number\": foofoo;;B level=2 listItem=\"bullet\": bar;;B listItem=\"number\": baz\|" |

  Scenario Outline: Inserting lower-level list on list item
    Given the editor state is "B level=2 listItem=\"number\": "
    When the caret is put after ""
    And ">#:foo|>#:bar|>#:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=2 listItem="number": foo
      B level=2 listItem="number": bar
      B level=2 listItem="number": baz|
      """

  Scenario: Inserting different lower-level list type on list item
    Given the editor state is "B level=2 listItem=\"number\": "
    When the caret is put after ""
    And ">-:foo|>-:bar|>-:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=2 listItem="bullet": foo
      B level=2 listItem="bullet": bar
      B level=2 listItem="bullet": baz|
      """

  Scenario: Inserting inverse-indented list on list item
    Given the editor state is "B level=2 listItem=\"number\": "
    When the caret is put after ""
    And ">>-:foo|>-:bar|>>-:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=2 listItem="bullet": foo
      B listItem="bullet": bar
      B level=2 listItem="bullet": baz|
      """

  Scenario: Inserting lower-level inverse-indented list on list item
    Given the editor state is "B level=3 listItem=\"number\": "
    When the caret is put after ""
    And ">>-:foo|>-:bar|>>-:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=3 listItem="bullet": foo
      B level=2 listItem="bullet": bar
      B level=3 listItem="bullet": baz|
      """

  Scenario: Inserting lower-level, indented list on list item
    Given the editor state is "B level=2 listItem=\"number\": "
    When the caret is put after ""
    And ">#:foo|>>#:bar|>>>#:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=2 listItem="number": foo
      B level=3 listItem="number": bar
      B level=4 listItem="number": baz|
      """

  Scenario: Inserting list that will exceed the maximum level (10)
    Given the editor state is "B level=9 listItem=\"number\": "
    When the caret is put after ""
    And ">#:foo|>>#:bar|>>>#:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=9 listItem="number": foo
      B level=10 listItem="number": bar
      B level=10 listItem="number": baz|
      """

  Scenario: Inserting list that exceeds the maximum level (10)
    Given the editor state is "B level=9 listItem=\"number\": "
    When the caret is put after ""
    And ">>>>>>>>>>>#:foo|>>>>>>>>>>>>#:bar|>>>>>>>>>>>>>#:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=9 listItem="number": foo
      B level=10 listItem="number": bar
      B level=10 listItem="number": baz|
      """

  Scenario: Inserting mixed blocks starting with a list item
    Given the editor state is "B level=2 listItem=\"bullet\": "
    When the caret is put after ""
    And ">#:foo|{image}|>>#:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=2 listItem="number": foo
      {IMAGE}
      B level=2 listItem="number": baz|
      """

  Scenario: Inserting mixed blocks not starting with a list item
    Given the editor state is "B level=2 listItem=\"bullet\": "
    When the caret is put after ""
    And "foo|>#:bar|>>#:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=2 listItem="bullet": foo
      B level=2 listItem="number": bar
      B level=3 listItem="number": baz|
      """

  Scenario: Inserting mixed blocks not starting with list items
    Given the editor state is "B level=2 listItem=\"bullet\": "
    When the caret is put after ""
    And "foo|bar|>#:baz" is inserted at "auto"
    Then the editor state is
      """
      B level=2 listItem="bullet": foo
      B: bar
      B listItem="number": baz|
      """

  Scenario Outline: Inserting two lists preceded by a paragraph
    Given the editor state is <text>
    When the caret is put after ""
    And <blocks> is inserted at "auto"
    Then the editor state is <new text>

    Examples:
      | text                              | blocks                                | new text                                                                                                                                             |
      | "B level=2 listItem=\"bullet\": " | "foo\|>-:bar\|>>-:baz\|fizz\|>-:buzz" | "B level=2 listItem=\"bullet\": foo;;B level=2 listItem=\"bullet\": bar;;B level=3 listItem=\"bullet\": baz;;B: fizz;;B listItem=\"bullet\": buzz\|" |
      | "B level=2 listItem=\"bullet\": " | "foo\|>#:bar\|>>#:baz\|fizz\|>#:buzz" | "B level=2 listItem=\"bullet\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz;;B: fizz;;B listItem=\"number\": buzz\|" |
      | "B level=2 listItem=\"number\": " | "foo\|>#:bar\|>>#:baz\|fizz\|>#:buzz" | "B level=2 listItem=\"number\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz;;B: fizz;;B listItem=\"number\": buzz\|" |
      | "B level=2 listItem=\"number\": " | "foo\|>-:bar\|>>-:baz\|fizz\|>-:buzz" | "B level=2 listItem=\"number\": foo;;B level=2 listItem=\"bullet\": bar;;B level=3 listItem=\"bullet\": baz;;B: fizz;;B listItem=\"bullet\": buzz\|" |

  Scenario: Inserting heading on empty list item
    Given the editor state is "B listItem=\"bullet\": "
    When the caret is put after ""
    And "h1:foo" is inserted at "auto"
    Then the editor state is
      """
      B listItem="bullet" style="h1": foo|
      """

  Scenario: Inserting heading on non-empty list item
    Given the editor state is
      """
      B listItem="bullet": foo
      """
    When the caret is put before "foo"
    And "h1:bar" is inserted at "auto"
    Then the editor state is
      """
      B listItem="bullet": bar|foo
      """

  Scenario: Inserting image on empty list item
    Given the editor state is "B listItem=\"bullet\": "
    When the caret is put after ""
    And "{image}" is inserted at "auto"
    Then the editor state is "^{IMAGE}|"

  Scenario Outline: Deleting list
    Given the editor state is <text>
    When the editor is focused
    And <selection> is selected
    And "{Backspace}" is pressed
    Then the editor state is <new text>

    Examples:
      | text                                                                                                 | selection   | new text                      |
      | "B listItem=\"number\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz" | "foobarbaz" | "B listItem=\"number\": \|"   |
      | "B listItem=\"number\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz" | "oobarbaz"  | "B listItem=\"number\": f\|"  |
      | "B listItem=\"number\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz" | "oobarba"   | "B listItem=\"number\": f\|z" |
      | "B listItem=\"number\": foo;;B level=2 listItem=\"number\": bar;;B level=3 listItem=\"number\": baz" | "foobarba"  | "B listItem=\"number\": \|z"  |

  Scenario: Undo after deleting list
    Given the editor state is
      """
      B listItem="number": foo
      B level=2 listItem="number": bar
      """
    When the editor is focused
    And "fooba" is selected
    And "{Backspace}" is pressed
    Then the editor state is
      """
      B listItem="number": |r
      """
    When undo is performed
    Then the editor state is
      """
      B listItem="number": ^foo
      B level=2 listItem="number": ba|r
      """
