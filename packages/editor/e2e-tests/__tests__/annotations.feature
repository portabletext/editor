# Complex marks like links
Feature: Annotations

  Background:
    Given two editors
    And a global keymap

  # Mimics Notion's behaviour
  # Warning: Possible wrong behaviour
  # The caret should be after "bar"
  Scenario: Selection after adding an annotation
    Given the text "foo bar baz"
    When "bar" is selected
    And "link" "l1" is toggled
    Then "bar" has marks "l1"
    And "bar" is selected

  # Mimics Google Docs' behaviour
  @skip
  Scenario: Selection after adding an annotation
    Given the text "foo bar baz"
    When "bar" is selected
    And "link" "l1" is toggled
    Then "bar" has marks "l1"
    Then the caret is after "bar"

  Scenario: Inserting text after an annotation
    Given the text "foo"
    And a "link" "l1" around "foo"
    When the caret is put after "foo"
    And "bar" is typed
    Then "foo" has marks "l1"
    And "bar" has no marks

  Scenario Outline: Toggling annotation on with a collapsed selection
    Given the text "foo bar baz"
    When the caret is put <position>
    And "link" "l1" is toggled
    Then "bar" has marks "l1"

    Examples:
      | position     |
      | before "bar" |
      | after "bar"  |
      | after "ar"   |

  Scenario: Toggling annotation on with a collapsed selection inside split block
    Given the text "foo bar baz"
    And "strong" around "bar"
    When the caret is put before "az"
    And "link" "l1" is toggled
    Then the text is "foo ,bar, ,baz"
    And "foo " has no marks
    And "bar" has marks "strong"
    And " " has no marks
    And "baz" has marks "l1"

  Scenario Outline: Toggling annotation off with a collapsed selection
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When the caret is put <position>
    And "link" is toggled
    Then "foo bar baz" has no marks

    Examples:
      | position     |
      | before "foo" |
      | after "o b"  |
      | after "baz"  |

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
    And "foo" has marks "c1"
    And "bar" has no marks