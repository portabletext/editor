Feature: Annotations Collaboration

  Background:
    Given two editors
    And a global keymap

  Scenario: Editor B inserts text after Editor A's half-deleted annotation
    When "foo" is typed
    And "foo" is selected
    And "comment" "c1" is toggled
    And the caret is put after "foo"
    And "{Backspace}" is pressed
    And Editor B is focused
    And the caret is put after "fo" by Editor B
    And "a" is typed by Editor B
    Then the text is "fo,a"
    And "fo" has marks "c1"
    And "a" has no marks
