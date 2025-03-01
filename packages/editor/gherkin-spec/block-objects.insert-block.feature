Feature: Insert Block

  Background:
    Given one editor

  Scenario Outline: Inserting block object on text block
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put <position>
    And an "image" is inserted
    Then the text is <text>

    Examples:
      | position     | text                  |
      | before "foo" | "[image]\|foo\|bar"   |
      | after "f"    | "f\|[image]\|oo\|bar" |
      | after "foo"  | "foo\|[image]\|bar"   |
