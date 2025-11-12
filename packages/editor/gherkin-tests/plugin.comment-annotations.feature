# Making sure that comment annotations can overlap and
# that decorators aren't contained within comments like
# they are with regular annotations
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

  Scenario: Writing after bold text with comment within a larger comment
    Given the text "foo bar baz"
    And "strong" around "bar"
    And a "comment" "c1" around "bar"
    And a "comment" "c2" around "foo bar baz"
    When the caret is put after "bar"
    And "new" is typed
    Then the text is "foo ,bar,new, baz"
    And "bar" has marks "strong,c1,c2"
    And "new" has marks "strong,c2"

  Scenario Outline: Writing after bold text with comment
    Given the text "foo bar baz"
    When the editor is focused
    Given "strong" around "bar"
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

  Scenario: Writing after bold text with comment and link
    Given the text "foo bar baz"
    When the editor is focused
    Given "strong" around "bar"
    And a "comment" "c1" around "bar"
    And a "link" "l1" around "bar"
    When the caret is put after "bar"
    And "new" is typed
    Then the text is "foo ,bar,new baz"
    And "bar" has marks "strong,c1,l1"
    And "new" has no marks

  Scenario: Writing in link after bold text with comment
    Given the text "foo bar baz"
    When the editor is focused
    Given "strong" around "bar"
    And a "comment" "c1" around "bar"
    And a "link" "l1" around "foo bar baz"
    When the caret is put after "bar"
    And "new" is typed
    Then the text is "foo ,bar,new, baz"
    And "foo " has marks "l1"
    And "bar" has marks "strong,c1,l1"
    And "new" has marks "strong,l1"
    And " baz" has marks "l1"
