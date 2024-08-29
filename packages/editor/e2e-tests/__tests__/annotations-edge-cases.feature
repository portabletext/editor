Feature: Annotations Edge Cases

  Scenario: Editor B inserts text after Editor A's half-deleted annotation
    Given the text "foo"
    And a "comment" "c1" around "foo"
    When the caret is put after "foo"
    And "Backspace" is pressed
    And the caret is put after "fo" by editor B
    And "a" is typed by editor B
    Then the text is "fo,a"
    And "fo" is marked with "c1"
    And "a" has no marks

  Scenario: Deleting emphasised paragraph with comment in the middle
    Given the text "foo bar baz"
    And "em" around "foo bar baz"
    And a "comment" "c1" around "bar"
    When "foo bar baz" is selected
    And "Backspace" is pressed
    Then the editor is empty

  Scenario: Deleting half of annotated text
    Given the text "foo bar baz"
    And a "comment" "c1" around "foo bar baz"
    When " baz" is selected
    And "Backspace" is pressed
    Then the text is "foo bar"
    And "foo bar" is marked with "c1"

  Scenario: Deleting annotation in the middle of text
    Given the text "foo bar baz"
    And a "comment" "c1" around "bar"
    When "bar " is selected
    And "Backspace" is pressed
    Then the text is "foo baz"
    And "foo baz" has no marks
