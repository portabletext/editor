Feature: Insert Block

  Background:
    Given one editor

  Scenario Outline: Inserting block object on an empty editor
    When a block is inserted <placement>
      ```
      {
        "_type": "image"
      }
      ```
    Then the text is <text>

    Examples:
      | placement | text      |
      | "before"  | "[image]" |
      | "after"   | "[image]" |
      | "auto"    | "[image]" |

  Scenario Outline: Inserting block object on block object
    Given a block "auto"
      ```
      {
        "_type": "image"
      }
      ```
    When a block is inserted <placement>
      ```
      {
        "_type": "break"
      }
      ```
    Then the text is <text>

    Examples:
      | placement | text               |
      | "before"  | "[break]\|[image]" |
      | "after"   | "[image]\|[break]" |
      | "auto"    | "[image]\|[break]" |

  Scenario Outline: Inserting block object on text block
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put <position>
    And a block is inserted <placement>
      ```
      {
        "_type": "image"
      }
      ```
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

  Scenario Outline: Inserting text block on text block
    Given the text "foo"
    When the caret is put <position>
    And a block is inserted <placement>
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "bar"}]
      }
      ```
    And "baz" is typed
    Then the text is <text>

    Examples:
      | position     | placement | text          |
      | after "foo"  | "before"  | "bar\|foobaz" |
      | after "foo"  | "after"   | "foobaz\|bar" |
      | after "foo"  | "auto"    | "foobazbar"   |
      | before "foo" | "before"  | "bar\|bazfoo" |
      | before "foo" | "after"   | "bazfoo\|bar" |
      | before "foo" | "auto"    | "bazbarfoo"   |
      | after "f"    | "before"  | "bar\|fbazoo" |
      | after "f"    | "after"   | "fbazoo\|bar" |
      | after "f"    | "auto"    | "fbazbaroo"   |
