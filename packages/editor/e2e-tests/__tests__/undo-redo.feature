Feature: Undo/Redo

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

  Scenario: Undoing local annotation before remote annotation
    Given the text "foobar"
    And a "comment" "c1" around "foo"
    And a "comment" "c2" around "bar" by editor B
    When undo is performed
    Then the text is "foo,bar"
    And "foo" has no marks
    And "bar" has marks "c2"

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
