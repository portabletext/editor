Feature: Undo/Redo Collaboration

  Background:
    Given two editors
    And a global keymap

  Scenario: Undoing local annotation added before remote annotation
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    And a "link" "l1" around "bar" by editor B
    When undo is performed
    Then the text is "foo,bar"
    And "foo" has no marks
    And "bar" has marks "l1"

  Scenario: Undoing local annotation added after remote annotation
    Given the text "foobar"
    And a "link" "l1" around "bar" by editor B
    And a "comment" "c1" around "foo"
    When undo is performed
    Then the text is "foo,bar"
    And "foo" has no marks
    And "bar" has marks "l1"

  Scenario: Undoing local same-type annotation added before remote annotation
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    And a "comment" "c2" around "bar" by editor B
    When undo is performed
    Then the text is "foo,bar"
    And "foo" has no marks
    And "bar" has marks "c2"

  # Currently fails
  @skip
  Scenario: Undoing and redoing local annotation before remote annotation
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    And a "comment" "c2" around "bar" by editor B
    When undo is performed
    Then the text is "foo,bar"
    And "foo" has no marks
    And "bar" has marks "c2"
    When redo is performed
    Then "foo" has marks "c1"
    And "bar" has marks "c2"
