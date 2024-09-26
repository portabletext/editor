Feature: Undo/Redo Collaboration

  Background:
    Given two editors
    And a global keymap

  Scenario: Undoing deleting before remote text
    Given the text "hello world"
    When the caret is put after "hello world"
    And "Backspace" is pressed
    And the caret is put after "hello worl" by editor B
    And " there" is typed by editor B
    Then the text is "hello worl there"
    When undo is performed
    Then the text is "hello world there"

  Scenario: Undoing respective changes
    Given the text "foo bar baz"
    When the caret is put after "foo"
    And the caret is put after "bar" by editor B
    And "o" is typed
    And "o" is typed
    And "o" is typed
    And "r" is typed by editor B
    And "r" is typed by editor B
    And "r" is typed by editor B
    Then the text is "fooooo barrrr baz"
    When undo is performed
    Then the text is "foo barrrr baz"
    When undo is performed by editor B
    Then the text is "foo bar baz"

  Scenario: Undoing respective changes in different blocks
    Given the text "foo" in block "b1"
    And the text "bar" in block "b2"
    When the caret is put after "foo"
    And the caret is put after "bar" by editor B
    And "o" is typed
    And "o" is typed
    And "o" is typed
    And "r" is typed by editor B
    And "r" is typed by editor B
    And "r" is typed by editor B
    Then the text is "fooooo,\n,barrrr"
    When undo is performed
    Then the text is "foo,\n,barrrr"
    When undo is performed by editor B
    Then the text is "foo,\n,bar"

  # Currently fails
  @skip
  Scenario: Undoing changes after remote block split
    Given the text "foo bar"
    When the caret is put after "bar"
    And " baz" is typed
    And the caret is put after "foo" by editor B
    And "Enter" is pressed by editor B
    And undo is performed
    Then the text is "foo,\n, bar"

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
