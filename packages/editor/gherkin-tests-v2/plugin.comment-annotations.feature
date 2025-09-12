Feature: Comment Annotations Plugin

  Scenario: Overlapping comments
    Given the text "foo bar baz"
    When "bar" is selected
    And "comment" "c1" is toggled
    And "bar baz" is selected
    And "comment" "c2" is toggled
    Then the text is "foo ,bar, baz"
    And "bar" has marks "c1,c2"
    And " baz" has marks "c2"

  @skip
  Scenario Outline: Writing after bold text with comment
    Given the text "foo bar baz"
    And the editor is focused
    And "strong" around "bar"
    And a "comment" "c1" around "bar"
    When the caret is put <position>
    And "new" is typed
    Then the text is "foo ,bar,new, baz"
    And "bar" has marks "strong,c1"
    And "new" has marks "strong"

    Examples:
      | position      |
      | after "bar"   |
      | before " baz" |
