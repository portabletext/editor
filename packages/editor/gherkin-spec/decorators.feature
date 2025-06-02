# Simple marks like bold and italic
Feature: Decorators

  Background:
    Given one editor

  Scenario Outline: Inserting text at the edge of a decorator
    Given the text <text>
    When <decorated> is selected
    And "strong" is toggled
    When the caret is put <position>
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text          | decorated | position      | new text           |
      | "foo bar baz" | "bar"     | after "foo "  | "foo new,bar, baz" |
      | "foo bar baz" | "bar"     | before "bar"  | "foo new,bar, baz" |
      | "foo bar baz" | "bar"     | after "bar"   | "foo ,barnew, baz" |
      | "foo bar baz" | "bar"     | before " baz" | "foo ,barnew, baz" |
      | "foo"         | "foo"     | before "foo"  | "newfoo"           |
      | "foo"         | "foo"     | after "foo"   | "foonew"           |

  Scenario Outline: Toggling decorator at the edge of a decorator
    Given the text <text>
    And "em" around <decorated>
    When the caret is put <position>
    And "strong" is toggled
    And "new" is typed
    Then the text is <new text>
    And "new" has marks <marks>

    Examples:
      | text          | decorated | position      | new text            | marks       |
      | "foo bar baz" | "bar"     | after "foo "  | "foo ,new,bar, baz" | "strong"    |
      | "foo bar baz" | "bar"     | before "bar"  | "foo ,new,bar, baz" | "strong"    |
      | "foo bar baz" | "bar"     | after "bar"   | "foo ,bar,new, baz" | "em,strong" |
      | "foo bar baz" | "bar"     | before " baz" | "foo ,bar,new, baz" | "em,strong" |
      | "foo"         | "foo"     | before "foo"  | "new,foo"           | "em,strong" |
      | "foo"         | "foo"     | after "foo"   | "foo,new"           | "em,strong" |

  Scenario: Writing on top of a decorator
    Given the text "foo bar baz"
    When "bar" is selected
    And "strong" is toggled
    When "removed" is typed
    Then the text is "foo ,removed, baz"
    And "removed" has marks "strong"

  Scenario: Toggling bold inside italic
    Given the text "foo bar baz"
    When "foo bar baz" is selected
    And "em" is toggled
    And "bar" is selected
    And "strong" is toggled
    Then the text is "foo ,bar, baz"
    And "bar" has marks "em,strong"
    And "foo " has marks "em"
    And "bar" has marks "em,strong"
    And " baz" has marks "em"
    When "bar" is selected
    And "strong" is toggled
    Then the text is "foo bar baz"
    And "foo bar baz" has marks "em"

  Scenario: Toggling bold inside italic as you write
    Given the text ""
    When the caret is put after ""
    And "em" is toggled
    And "foo " is typed
    And "strong" is toggled
    And "bar" is typed
    And "strong" is toggled
    And " baz" is typed
    Then the text is "foo ,bar, baz"
    Then "foo " has marks "em"
    And "bar" has marks "em,strong"
    And " baz" has marks "em"

  Scenario: Toggling decorator mid-text and navigating left to clear it
    Given the text "foo"
    When "strong" is toggled
    And "{ArrowLeft}" is pressed
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then the text is "foobar"
    And "foobar" has no marks

  Scenario: Deleting marked text and writing again, marked
    Given the text ""
    When the caret is put after ""
    When "strong" is toggled
    And "foo" is typed
    And "{Backspace}" is pressed 3 times
    And "bar" is typed
    Then "bar" has marks "strong"

  Scenario: Adding bold across an empty block and typing in the same
    Given the text "foo"
    When "{Enter}" is pressed 2 times
    And "bar" is typed
    And "foobar" is selected
    And "strong" is toggled
    And the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then "bar" has marks "strong"

  Scenario: Toggling bold across an empty block
    Given the text "foo"
    When "{Enter}" is pressed 2 times
    And "bar" is typed
    Then the text is "foo||bar"
    When "ooba" is selected
    And "strong" is toggled
    Then the text is "f,oo||ba,r"
    And "oo" has marks "strong"
    And "ba" has marks "strong"
    When "strong" is toggled
    Then the text is "foo||bar"

  Scenario Outline: Toggling bold on a cross-selection with the first line empty
    Given the text "foo"
    When "{ArrowUp}" is pressed
    And "{Enter}" is pressed
    And everything is <selection>
    And "strong" is toggled
    Then the text is "|foo"
    And "" has marks "strong"
    And "foo" has marks "strong"
    When "strong" is toggled
    Then the text is "|foo"
    And "" has no marks
    And "foo" has no marks

    Examples:
      | selection          |
      | selected           |
      | selected backwards |

  Scenario Outline: Toggling bold on a cross-selection with the last line empty
    Given the text "foo"
    When "{Enter}" is pressed
    And everything is <selection>
    And "strong" is toggled
    Then the text is "foo|"
    And "foo" has marks "strong"
    And "" has marks "strong"
    When "strong" is toggled
    Then the text is "foo|"
    And "foo" has no marks
    And "" has no marks

    Examples:
      | selection          |
      | selected           |
      | selected backwards |

  Scenario: Splitting block before decorator
    Given the text "foo"
    And "strong" around "foo"
    When the caret is put before "foo"
    And "{Enter}" is pressed
    And "{ArrowUp}" is pressed
    And "bar" is typed
    Then the text is "bar|foo"
    And "bar" has marks "strong"
    And "foo" has marks "strong"

  Scenario Outline: Splitting block at the edge of decorator
    Given the text "foo bar baz"
    And "strong" around "bar"
    When the caret is put <position>
    And "{Enter}" is pressed
    Then the text is <new text>
    And the caret is <new position>

    Examples:
      | position      | new text         | new position  |
      | after "foo "  | "foo \|bar, baz" | before "bar"  |
      | before "bar"  | "foo \|bar, baz" | before "bar"  |
      | after "bar"   | "foo ,bar\| baz" | before " baz" |
      | before " baz" | "foo ,bar\| baz" | before " baz" |

  Scenario: Toggling decorators in empty block
    Given the text ""
    When "foo" is typed
    And "{Backspace}" is pressed 3 times
    And "strong" is toggled
    Then the text is ""
    And "" has marks "strong"

  Scenario: Splitting empty decorated block
    Given the text "foo"
    When "{Enter}" is pressed
    And "strong" is toggled
    And "{Enter}" is pressed
    And "{ArrowUp}" is pressed
    And "bar" is typed
    And "{ArrowDown}" is pressed
    And "baz" is typed
    Then the text is "foo|bar|baz"
    And "foo" has no marks
    And "bar" has marks "strong"
    And "baz" has no marks

  Scenario: Merging spans with same but different-ordered decorators
    Given the text "foobar"
    And "strong" around "foo"
    And "em" around "bar"
    Then the text is "foo,bar"
    And "foo" has marks "strong"
    And "bar" has marks "em"
    When "foo" is selected
    And "em" is toggled
    And "bar" is selected
    And "strong" is toggled
    Then the text is "foobar"
    And "foobar" has marks "strong,em"

  Scenario: Toggling decorator with leading block object and trailing empty text
    Given a block "auto"
      ```
      {
        "_type": "image"
      }
      ```
    And a block "auto"
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "foo"}]
      }
      ```

    And a block "after"
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": ""}]
      }
      ```
    When everything is selected
    And "strong" is toggled
    Then "foo" has marks "strong"
    And "" has marks "strong"
    When "strong" is toggled
    Then "foo" has no marks
    And "" has no marks
