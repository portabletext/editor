Feature: Annotations
  Scenario: Selection after adding an annotation
    Given the text "foo bar baz"
    When "bar" is selected
    And "link" "l1" is toggled
    Then "bar" is marked with "l1"
    And "bar" is selected

  @skip
  # Mimics Google Docs' behaviour
  Scenario: Selection after adding an annotation
    Given the text "foo bar baz"
    When "bar" is selected
    And "link" "l1" is toggled
    Then "bar" is marked with "l1"
    Then the caret is after "bar"

  Scenario: Inserting text after an annotation
    Given the text "foo"
    And a "link" "l1" around "foo"
    When the caret is put after "foo"
    And "bar" is typed
    Then "foo" is marked with "l1"
    And "bar" has no marks

  # Warning: Possible wrong behaviour
  # The " baz" link should have a unique key
  Scenario: Toggling part of an annotation off
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "link" is toggled
    Then the text is "foo ,bar, baz"
    And "foo " is marked with "l1"
    And "bar" has no marks
    And " baz" is marked with "l1"

  Scenario Outline: Toggling annotation on with a collapsed selection
    Given the text "foo bar baz"
    When the caret is put <position>
    And "link" "l1" is toggled
    Then "bar" is marked with "l1"

    Examples:
      | position |
      | before "bar" |
      | after "bar" |
      | after "ar" |

  Scenario Outline: Toggling annotation off with a collapsed selection
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When the caret is put <position>
    And "link" is toggled
    Then "foo bar baz" has no marks

    Examples:
      | position |
      | before "foo" |
      | after "o b" |
      | after "baz" |

  Scenario: Writing on top of annotation
    Given the text "foo bar baz"
    And a "comment" "c1" around "bar"
    When "removed" is typed
    Then the text is "foo removed baz"
    And "foo removed baz" has no marks

  Scenario: Inserting text after an annotation
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When the caret is put after "foo"
    And "bar" is typed
    Then the text is "foo,bar"
    And "foo" is marked with "c1"
    And "bar" has no marks

  Scenario: Splitting block before annotation
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When the caret is put before "foo"
    And "Enter" is pressed
    Then the text is ",\n,foo"
    And "" has no marks
    And "foo" is marked with "c1"

  Scenario: Splitting block after annotation
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,"
    And "foo" is marked with "c1"
    And "" has no marks

  # Warning: Possible wrong behaviour
  # "bar" should be marked with a new comment
  Scenario: Splitting an annotation
    Given the text "foobar"
    And a "comment" "c1" around "foobar"
    When the caret is put after "foo"
    And "Enter" is pressed
    Then the text is "foo,\n,bar"
    And "foo" is marked with "c1"
    And "bar" is marked with "c1"

  Scenario: Merging blocks with annotations
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And a "comment" "c1" around "foo"
    And a "comment" "c2" around "bar"
    And the caret is put before "bar"
    And "Backspace" is pressed
    Then the text is "foo,bar"
    And "foo" is marked with "c1"
    And "bar" is marked with "c2"

  # Warning: Possible wrong behaviour
  # "f" and "r" should end up on the same line
  Scenario: Deleting across annotated blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And a "comment" "c1" around "foo"
    And a "comment" "c2" around "bar"
    And "ooba" is selected
    And "Backspace" is pressed
    Then the text is "f,\n,r"
    And "f" is marked with "c1"
    And "r" is marked with "c2"

  # Warning: Possible wrong behaviour
  # "foo" should be marked with a comment
  Scenario: Adding annotation across blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "comment" "c1" is toggled
    Then "foo" has no marks
    And "bar" is marked with "c1"

  # Warning: Possible wrong behaviour
  # "bar" should be marked with a comment
  Scenario: Adding annotation across blocks (backwards selection)
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected backwards
    And "comment" "c1" is toggled
    Then "foo" is marked with "c1"
    And "bar" has no marks

