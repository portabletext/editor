Feature: Insert Blocks

  Background:
    Given one editor

  Scenario Outline: Inserting block objects an empty editor
    When blocks are inserted <placement>
      ```
      [
        {
          "_type": "image"
        }
      ]
      ```
    Then the text is <text>

    Examples:
      | placement | text        |
      | "before"  | "[image]\|" |
      | "after"   | "\|[image]" |
      | "auto"    | "[image]"   |

  Scenario Outline: Inserting blocks on a block object
    When a block is inserted "auto" and selected at the "end"
      ```
      {
        "_type": "image"
      }
      ```
    And blocks are inserted "auto"
      ```
      [
        {
          "_type": "block",
          "children": [{"_type": "span", "text": "foo"}]
        },
        {
          "_type": "break"
        },
        {
          "_type": "block",
          "children": [{"_type": "span", "text": "bar"}]
        }
      ]
      ```
    Then the text is <text>

    Examples:
      | text                         |
      | "[image]\|foo\|[break]\|bar" |

  Scenario Outline: Inserting blocks on a text block
    Given the text "foo"
    When the caret is put <position>
    And blocks are inserted <placement>
      ```
      [
        {
          "_type": "block",
          "children": [{"_type": "span", "text": "bar"}]
        },
        {
          "_type": "image"
        },
        {
          "_type": "block",
          "children": [{"_type": "span", "text": "baz"}]
        }
      ]
      ```
    Then the text is <text>

    Examples:
      | position     | placement | text                     |
      | before "foo" | "before"  | "bar\|[image]\|baz\|foo" |
      | before "foo" | "after"   | "foo\|bar\|[image]\|baz" |
      | before "foo" | "auto"    | "bar\|[image]\|bazfoo"   |
      | after "f"    | "before"  | "bar\|[image]\|baz\|foo" |
      | after "f"    | "after"   | "foo\|bar\|[image]\|baz" |
      | after "f"    | "auto"    | "fbar\|[image]\|bazoo"   |
      | after "foo"  | "before"  | "bar\|[image]\|baz\|foo" |
      | after "foo"  | "after"   | "foo\|bar\|[image]\|baz" |
      | after "foo"  | "auto"    | "foobar\|[image]\|baz"   |
