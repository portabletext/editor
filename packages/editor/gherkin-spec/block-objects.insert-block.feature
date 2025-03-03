Feature: Insert Block

  Background:
    Given one editor

  Scenario Outline: Inserting block object on an empty editor
    When an "image" is inserted <placement>
    Then the text is <text>

    Examples:
      | placement | text      |
      | "before"  | "[image]" |
      | "after"   | "[image]" |
      | "auto"    | "[image]" |

  Scenario Outline: Inserting block object on text block
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put <position>
    And an "image" is inserted <placement>
    Then the text is <text>

    Examples:
      | position     | placement | text                  |
      | before "foo" | "before"  | "[image]\|foo\|bar"   |
      | after "f"    | "before"  | "[image]\|foo\|bar"   |
      | after "foo"  | "before"  | "[image]\|foo\|bar"   |
      | before "foo" | "after"   | "foo\|[image]\|bar"   |
      | after "f"    | "after"   | "foo\|[image]\|bar"   |
      | after "foo"  | "after"   | "foo\|[image]\|bar"   |
      | before "foo" | "auto"    | "[image]\|foo\|bar"   |
      | after "f"    | "auto"    | "f\|[image]\|oo\|bar" |
      | after "foo"  | "auto"    | "foo\|[image]\|bar"   |
