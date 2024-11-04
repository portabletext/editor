Feature: Annotations Overlapping Decorators

  Background:
    Given one editor
    And a global keymap

  Scenario Outline: Inserting text at the edge of a decorated annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    And "strong" around <decorated>
    When the caret is put <position>
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text          | annotated     | decorated     | position      | new text           |
      | "foo bar baz" | "bar"         | "bar"         | after "foo "  | "foo new,bar, baz" |
      | "foo bar baz" | "bar"         | "bar"         | before "bar"  | "foo new,bar, baz" |
      | "foo bar baz" | "bar"         | "bar"         | after "bar"   | "foo ,bar,new baz" |
      | "foo bar baz" | "bar"         | "bar"         | before " baz" | "foo ,bar,new baz" |
      | "foo"         | "foo"         | "foo"         | before "foo"  | "new,foo"          |
      | "foo"         | "foo"         | "foo"         | after "foo"   | "foo,new"          |
      | "foo bar baz" | "foo bar baz" | "bar"         | after "foo "  | "foo new,bar, baz" |
      | "foo bar baz" | "foo bar baz" | "bar"         | before "bar"  | "foo new,bar, baz" |
      | "foo bar baz" | "foo bar baz" | "bar"         | after "bar"   | "foo ,barnew, baz" |
      | "foo bar baz" | "foo bar baz" | "bar"         | before " baz" | "foo ,barnew, baz" |
      | "foo bar baz" | "bar"         | "foo bar baz" | after "foo "  | "foo new,bar, baz" |
      | "foo bar baz" | "bar"         | "foo bar baz" | before "bar"  | "foo new,bar, baz" |
      | "foo bar baz" | "bar"         | "foo bar baz" | after "bar"   | "foo ,bar,new baz" |
      | "foo bar baz" | "bar"         | "foo bar baz" | before " baz" | "foo ,bar,new baz" |

  Scenario Outline: Writing on top of a decorated annotation
    Given the text "foo bar baz"
    And a "link" "l1" around <annotated>
    And "strong" around <decorated>
    When <selected> is selected
    And "removed" is typed
    Then the text is <new text>
    And "removed" has marks <marks>

    Examples:
      | annotated     | decorated | selected | new text            | marks       |
      | "bar"         | "bar"     | "bar"    | "foo ,removed, baz" | "strong"    |
      | "foo bar baz" | "bar"     | "bar"    | "foo ,removed, baz" | "l1,strong" |

  Scenario: Splitting block before a decorated annotation
    Given the text "bar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the caret is put before "bar"
    And "Enter" is pressed
    And "ArrowUp" is pressed
    And "foo" is typed
    Then the text is "foo|bar"
    And the caret is after "foo"
    And "foo" has no marks

  Scenario: Splitting block after a decorated annotation
    Given the text "bar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the caret is put after "bar"
    And "Enter" is pressed
    And "baz" is typed
    Then the text is "bar|baz"
    And the caret is after "baz"
    And "baz" has no marks

  Scenario: Splitting block after a decorated annotation #2
    Given the text "foobar"
    And a "link" "l1" around "bar"
    And "strong" around "bar"
    When the caret is put after "bar"
    And "Enter" is pressed
    And "baz" is typed
    Then the text is "foo,bar|baz"
    And the caret is after "baz"
    And "baz" has no marks

  Scenario: Annotation and decorator on the same text
    Given the text "foo bar baz"
    When "bar" is selected
    And "strong" is toggled using the keyboard
    And "link" "l1" is toggled
    Then the text is "foo ,bar, baz"
    And "bar" has marks "strong,l1"

  Scenario: Adding decorator inside annotation
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "strong" is toggled using the keyboard
    Then the text is "foo ,bar, baz"
    And "foo " has marks "l1"
    And "bar" has marks "l1,strong"
    And " baz" has marks "l1"

  Scenario: Adding an annotation across a decorator
    Given the text "foo bar baz"
    And "strong" around "bar"
    When "foo bar baz" is selected
    And "link" "l1" is toggled
    Then the text is "foo ,bar, baz"
    And "foo " has marks "l1"
    And "bar" has marks "strong,l1"
    And " baz" has marks "l1"

  Scenario: Annotation overlapping decorator
    Given the text "foobar"
    And "strong" around "bar"
    When "foob" is selected
    And "link" "l1" is toggled
    Then the text is "foo,b,ar"
    And "foo" has marks "l1"
    And "b" has marks "strong,l1"
    And "ar" has marks "strong"

  Scenario: Annotation overlapping decorator (backwards selection)
    Given the text "foobar"
    And "strong" around "bar"
    When "foob" is selected backwards
    And "link" "l1" is toggled
    Then the text is "foo,b,ar"
    And "foo" has marks "l1"
    And "b" has marks "strong,l1"
    And "ar" has marks "strong"

  Scenario: Annotation overlapping decorator from behind
    Given the text "foobar"
    And "strong" around "foo"
    When "obar" is selected
    And "link" "l1" is toggled
    Then the text is "fo,o,bar"
    Then "fo" has marks "strong"
    And "o" has marks "strong,l1"
    And "bar" has marks "l1"

  Scenario: Annotation overlapping decorator from behind (backwards selection)
    Given the text "foobar"
    And "strong" around "foo"
    When "obar" is selected backwards
    And "link" "l1" is toggled
    Then the text is "fo,o,bar"
    Then "fo" has marks "strong"
    And "o" has marks "strong,l1"
    And "bar" has marks "l1"
