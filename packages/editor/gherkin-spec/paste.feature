Feature: Paste

  Background:
    Given one editor

  Scenario Outline: Pasting text block into a text block
    Given the text "foo bar buz"
    And "strong" around "bar"
    When <selection>
    And x-portable-text is pasted
      ```
      [
        {
          "_type": "block",
          "children": [
            {"_type": "span", "text": "foo "},
            {"_type": "span", "text": "bar", "marks": ["strong"]},
            {"_type": "span", "text": " buz"}
          ]
        }
      ]
      ```
    Then the text is <text>

    Examples:
      | selection                     | text                           |
      | the caret is put after "buz"  | "foo ,bar, buzfoo ,bar, buz"   |
      | the caret is put before "foo" | "foo ,bar, buzfoo ,bar, buz"   |
      | the caret is put after "ba"   | "foo ,ba,foo ,bar, buz,r, buz" |
      | "foo bar buz" is selected     | "foo ,bar, buz"                |

  Scenario: Pasting text/plain into a text block
    Given the text "foo bar buz"
    And "strong" around "bar"
    When the caret is put after "ba"
    And data is pasted
      | text/plain | new |
    Then the text is "foo ,banewr, buz"

  Scenario: Pasting text/html into a text block
    Given the text "foo bar buz"
    And "strong" around "bar"
    When the caret is put after "ba"
    And data is pasted
      | text/html | <p>new</p> |
    Then the text is "foo ,ba,new,r, buz"
