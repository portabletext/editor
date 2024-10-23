# Complex marks like links
Feature: Annotations

  Background:
    Given one editor
    And a global keymap

  Scenario: Selection after adding an annotation
    Given the text "foo bar baz"
    When "bar" is selected
    And "link" "l1" is toggled
    Then "bar" has marks "l1"
    And "bar" is selected

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

  Scenario: Toggling annotation off with a collapsed selection does not remove sibling annotations to the left
    Given the text "foo bar baz boo baa"
    And a "link" "l1" around "foo bar baz boo baa"
    And "strong" around "bar"
    When "boo" is selected
    And "link" is toggled
    And the caret is put before "baa"
    And "link" is toggled
    Then the text is "foo ,bar, baz ,boo baa"
    And "foo " has marks "l1"
    And "bar" has marks "l1,strong"
    And " baz " has marks "l1"
    And "boo baa" has no marks

  Scenario: Toggling annotation off with a collapsed selection does not remove sibling annotations to the right
    Given the text "foo bar baz boo baa"
    And a "link" "l1" around "foo bar baz boo baa"
    And "strong" around "boo"
    When "bar" is selected
    And "link" is toggled
    And the caret is put before "foo"
    And "link" is toggled
    Then the text is "foo bar, baz ,boo, baa"
    And "foo bar" has no marks
    And " baz " has marks "l1"
    And "boo" has marks "l1,strong"
    And " baa" has marks "l1"

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

  Scenario: Writing inside an annotation
    Given the text "foo baz"
    And a "link" "l1" around "foo baz"
    When the caret is put after "foo"
    And " bar" is typed
    Then the text is "foo bar baz"
    And "foo bar baz" has marks "l1"

  Scenario Outline: Inserting text at the edge of an annotation
    Given the text <text>
    And a "link" "l1" around <annotated>
    When the caret is put <position>
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text          | annotated | position      | new text           |
      | "foo bar baz" | "bar"     | after "foo "  | "foo new,bar, baz" |
      | "foo bar baz" | "bar"     | before "bar"  | "foo new,bar, baz" |
      | "foo bar baz" | "bar"     | after "bar"   | "foo ,bar,new baz" |
      | "foo bar baz" | "bar"     | before " baz" | "foo ,bar,new baz" |
      | "foo"         | "foo"     | before "foo"  | "new,foo"          |
      | "foo"         | "foo"     | after "foo"   | "foo,new"          |

  # This scenario uses some workaround steps to insert text after an inline
  # object. This is due to a bug related to wrong caret positioning after
  # inserting an inline object.
  Scenario Outline: Inserting text after inline object, before annotation
    Given a "stock-ticker"
    When "ArrowRight" is pressed 2 times
    And "bar" is typed
    And "bar" is marked with a "link" "l1"
    And the caret is put <position>
    And "foo " is typed
    Then the text is ",[stock-ticker],foo ,bar"

    Examples:
      | position               |
      | after "[stock-ticker]" |
      | before "bar"           |
