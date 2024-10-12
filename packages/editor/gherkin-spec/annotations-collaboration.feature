Feature: Annotations Collaboration

  Background:
    Given two editors
    And a global keymap

  Scenario: Editor B inserts text after Editor A's half-deleted annotation
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When the caret is put after "foo"
    And "Backspace" is pressed
    And the caret is put after "fo" by editor B
    And "a" is typed by editor B
    Then the text is "fo,a"
    And "fo" has marks "c1"
    And "a" has no marks
