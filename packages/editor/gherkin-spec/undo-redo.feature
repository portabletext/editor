Feature: Undo/Redo

  Background:
    Given one editor
    And a global keymap

  Scenario: Undoing annotation
    Given the text "foo"
    When "foo" is selected
    And "link" is toggled
    And undo is performed
    Then the text is "foo"
    And "foo" has no marks

  Scenario: Undoing the deletion of the last char of annotated text
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When "ArrowRight" is pressed
    And "Backspace" is pressed
    And undo is performed
    Then the text is "foo"
    And "foo" has marks "c1"

  Scenario: Redoing the deletion of the last char of annotated text
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When "ArrowRight" is pressed
    And "Backspace" is pressed
    And undo is performed
    When redo is performed
    Then the text is "fo"
    And "fo" has marks "c1"

  Scenario: Undoing inserting text after annotated text
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When "ArrowRight" is pressed
    And "Space" is pressed
    Then the text is "foo, "
    And "foo" has marks "c1"
    And " " has no marks
    When undo is performed
    Then the text is "foo"
    And "foo" has marks "c1"

  Scenario: Undoing and redoing inserting text after annotated text
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When "ArrowRight" is pressed
    And "Space" is pressed
    And undo is performed
    Then the text is "foo"
    And "foo" has marks "c1"
    When redo is performed
    Then the text is "foo, "
    And "foo" has marks "c1"
    And " " has no marks

  Scenario: Undoing the deletion of block with annotation at the end
    Given the text "foo bar"
    And a "comment" "c1" around "bar"
    When "foo bar" is selected
    And "Backspace" is pressed
    And undo is performed
    Then the text is "foo ,bar"
    And "bar" has marks "c1"

  Scenario: Undoing deletion of annotated block
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When "Backspace" is pressed
    And undo is performed
    Then the text is "foo"
    And "foo" has marks "c1"

  Scenario: Undoing annotation across text blocks
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And "foobar" is selected
    And "link" is toggled
    And undo is performed
    Then the text is "foo|bar"
    And "foo" has no marks
    And "bar" has no marks
