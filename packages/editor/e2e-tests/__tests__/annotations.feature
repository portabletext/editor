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

  Scenario: Toggling annotation off with a part-selection inside split block
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    And "strong" around "bar"
    When "baz" is selected
    And "link" is toggled
    Then the text is "foo ,bar, ,baz"
    And "foo " has marks "l1"
    And "bar" has marks "l1,strong"
    And " " has marks "l1"
    And "baz" has no marks
    And "baz" is selected

  Scenario: Toggling annotation off with a part-selection does not remove sibling annotations
    Given the text "foo bar baz"
    And a "link" "l1" around "foo "
    And a "link" "l2" around "bar baz"
    And "strong" around "bar"
    When "baz" is selected
    And "link" is toggled
    Then the text is "foo ,bar, ,baz"
    And "foo " has marks "l1"
    And "bar" has marks "l2,strong"
    And " " has marks "l2"
    And "baz" has no marks
    And "baz" is selected

  Scenario: Toggling annotation off with a collapsed selection inside split block
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    And "strong" around "bar"
    When the caret is put before "baz"
    And "link" is toggled
    Then the text is "foo ,bar, baz"
    And "foo " has no marks
    And "bar" has marks "strong"
    And " baz" has no marks
    And the caret is before "baz"

  Scenario: Toggling annotation off with a collapsed selection does not remove sibling annotations
    Given the text "foo bar baz"
    And a "link" "l1" around "foo bar baz"
    When "bar" is selected
    And "link" is toggled
    And the caret is put before "baz"
    And "link" is toggled
    Then the text is "foo ,bar baz"
    And "foo " has marks "l1"
    And "bar baz" has no marks

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
