Feature: Annotations Edge Cases

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

  Scenario: Deleting emphasised paragraph with comment in the middle
    Given the text "foo bar baz"
    And "em" around "foo bar baz"
    And a "comment" "c1" around "bar"
    When "foo bar baz" is being selected
    And "Backspace" is pressed
    Then the editor is empty

  Scenario: Deleting half of annotated text
    Given the text "foo bar baz"
    And a "comment" "c1" around "foo bar baz"
    When " baz" is being selected
    And "Backspace" is pressed
    Then the text is "foo bar"
    And "foo bar" has marks "c1"

  Scenario: Deleting annotation in the middle of text
    Given the text "foo bar baz"
    And a "comment" "c1" around "bar"
    When "bar " is being selected
    And "Backspace" is pressed
    Then the text is "foo baz"
    And "foo baz" has no marks

  # Warning: Possible wrong behaviour
  # "f" and "r" should end up on the same line
  Scenario: Deleting across annotated blocks
    Given an empty editor
    When "foo" is typed
    And "Enter" is pressed
    And "bar" is typed
    And a "link" "l1" around "foo"
    And a "link" "l2" around "bar"
    And "ooba" is being selected
    And "Backspace" is pressed
    Then the text is "f,\n,r"
    And "f" has marks "l1"
    And "r" has marks "l2"
