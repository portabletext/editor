Feature: Insert Block

  Background:
    Given one editor

  Scenario Outline: Inserting block object on an empty editor
    When a block is inserted <placement> and selected at the <position>
      ```
      {
        "_type": "image"
      }
      ```
    Then the text is <text>
    And nothing is selected

    Examples:
      | placement | position | text        |
      | "before"  | "none"   | "[image]\|" |
      | "after"   | "none"   | "\|[image]" |
      | "auto"    | "none"   | "[image]"   |

  Scenario Outline: Inserting block object on an empty text block
    Given the text "f"
    When "Backspace" is pressed
    And a block is inserted <placement>
      ```
      {
        "_type": "image"
      }
      ```
    Then the text is <text>

    Examples:
      | placement | text        |
      | "before"  | "[image]\|" |
      | "after"   | "\|[image]" |
      | "auto"    | "[image]"   |

  Scenario Outline: Inserting text block on an empty editor
    When a block is inserted <placement> and selected at the "none"
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "foo"}]
      }
      ```
    Then the text is <text>
    And nothing is selected

    Examples:
      | placement | text    |
      | "before"  | "foo\|" |
      | "after"   | "\|foo" |
      | "auto"    | "foo"   |

  Scenario Outline: Inserting and selecting text block on an empty editor
    When a block is inserted <placement> and selected at the <position>
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "foo"}]
      }
      ```
    And "bar" is typed
    Then the text is <text>

    Examples:
      | placement | position | text       |
      | "before"  | "start"  | "barfoo\|" |
      | "before"  | "end"    | "foobar\|" |
      | "before"  | "none"   | "barfoo\|" |
      | "after"   | "start"  | "\|barfoo" |
      | "after"   | "end"    | "\|foobar" |
      | "after"   | "none"   | "bar\|foo" |
      | "auto"    | "start"  | "barfoo"   |
      | "auto"    | "end"    | "foobar"   |
      | "auto"    | "none"   | "barfoo"   |

  Scenario Outline: Inserting block object on block object
    Given a block at "auto" selected at the <block selection>
      ```
      {
        "_key": "k-i",
        "_type": "image"
      }
      ```
    When a block is inserted <new block placement> and selected at the <new block selection>
      ```
      {
        "_key": "k-b",
        "_type": "break"
      }
      ```
    Then the text is <text>
    Then <selection> is selected

    Examples:
      | block selection | new block placement | new block selection | text               | selection   |
      | "start"         | "before"            | "start"             | "[break]\|[image]" | block "k-b" |
      # | "start"         | "after"             | "start"             | "[image]\|[break]" | block "k-b" |
      # | "start"         | "auto"              | "start"             | "[image]\|[break]" | block "k-b" |
      | "start"         | "before"            | "end"               | "[break]\|[image]" | block "k-b" |
      # | "start"         | "after"             | "end"               | "[image]\|[break]" | block "k-b" |
      # | "start"         | "auto"              | "end"               | "[image]\|[break]" | block "k-b" |
      | "start"         | "before"            | "none"              | "[break]\|[image]" | block "k-i" |
      # | "start"         | "after"             | "none"              | "[image]\|[break]" | block "k-i" |
      # | "start"         | "auto"              | "none"              | "[image]\|[break]" | block "k-i" |
      # | "start"         | "after"             | "start"             | "[image]\|[break]" | block "k-b" |
      # | "start"         | "auto"              | "start"             | "[image]\|[break]" | block "k-b" |
      | "end"           | "before"            | "start"             | "[break]\|[image]" | block "k-b" |
      | "end"           | "before"            | "end"               | "[break]\|[image]" | block "k-b" |
      | "end"           | "before"            | "none"              | "[break]\|[image]" | block "k-i" |
      | "none"          | "before"            | "start"             | "[break]\|[image]" | block "k-b" |
      | "none"          | "after"             | "start"             | "[image]\|[break]" | block "k-b" |
      | "none"          | "auto"              | "start"             | "[image]\|[break]" | block "k-b" |
      | "none"          | "before"            | "end"               | "[break]\|[image]" | block "k-b" |
      | "none"          | "after"             | "end"               | "[image]\|[break]" | block "k-b" |
      | "none"          | "auto"              | "end"               | "[image]\|[break]" | block "k-b" |
      | "none"          | "before"            | "none"              | "[break]\|[image]" | nothing     |
      | "none"          | "after"             | "none"              | "[image]\|[break]" | nothing     |
      | "none"          | "auto"              | "none"              | "[image]\|[break]" | nothing     |

  Scenario Outline: Inserting and selecting block object on block object
    Given a block "auto"
      ```
      {
        "_type": "image"
      }
      ```
    When a block is inserted <placement> and selected at the <position>
      ```
      {
        "_type": "break"
      }
      ```
    And "Enter" is pressed
    And "foo" is typed
    Then the text is <text>

    Examples:
      | placement | position | text                    |
      | "before"  | "start"  | "[break]\|foo\|[image]" |
      | "before"  | "end"    | "[break]\|foo\|[image]" |
      | "before"  | "none"   | "[break]\|[image]"      |
      | "after"   | "start"  | "[image]\|[break]\|foo" |
      | "after"   | "end"    | "[image]\|[break]\|foo" |
      | "after"   | "none"   | "[image]\|[break]"      |
      | "auto"    | "start"  | "[image]\|[break]\|foo" |
      | "auto"    | "end"    | "[image]\|[break]\|foo" |
      | "auto"    | "none"   | "[image]\|[break]"      |

  Scenario Outline: Inserting block object on text block
    Given the text "foo"
    When "Enter" is pressed
    And "bar" is typed
    And the caret is put <position>
    And a block is inserted <placement> and selected at the "none"
      ```
      {
        "_type": "image"
      }
      ```
    Then the text is <text>
    And the caret is <position>

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

  Scenario Outline: Inserting text block on block object
    Given a block "auto"
      ```
      {
        "_type": "image"
      }
      ```
    When a block is inserted <placement> and selected at the "none"
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "foo"}]
      }
      ```
    Then the text is <text>
    And nothing is selected

    Examples:
      | placement | text           |
      | "before"  | "foo\|[image]" |
      | "after"   | "[image]\|foo" |
      | "auto"    | "[image]\|foo" |

  Scenario Outline: Inserting text block on text block
    Given the text "foo"
    When the caret is put <position>
    And a block is inserted <placement> and selected at the "none"
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "bar"}]
      }
      ```
    Then the text is <text>
    And the caret is <position>

    Examples:
      | position     | placement | text       |
      | after "foo"  | "before"  | "bar\|foo" |
      | after "foo"  | "after"   | "foo\|bar" |
      | after "foo"  | "auto"    | "foobar"   |
      | before "foo" | "before"  | "bar\|foo" |
      | before "foo" | "after"   | "foo\|bar" |
      | before "foo" | "auto"    | "barfoo"   |
      | after "f"    | "before"  | "bar\|foo" |
      | after "f"    | "after"   | "foo\|bar" |
      | after "f"    | "auto"    | "fbaroo"   |

  Scenario Outline: Inserting and selecting text block on text block
    Given the text "foo"
    When the caret is put <position>
    And a block is inserted <placement> and selected at the <select-position>
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "bar"}]
      }
      ```
    And "baz" is typed
    Then the text is <text>

    Examples:
      | position     | placement | select-position | text          |
      | after "foo"  | "before"  | "start"         | "bazbar\|foo" |
      | after "foo"  | "before"  | "end"           | "barbaz\|foo" |
      | after "foo"  | "before"  | "none"          | "bar\|foobaz" |
      | after "foo"  | "after"   | "start"         | "foo\|bazbar" |
      | after "foo"  | "after"   | "end"           | "foo\|barbaz" |
      | after "foo"  | "after"   | "none"          | "foobaz\|bar" |
      | after "foo"  | "auto"    | "start"         | "foobazbar"   |
      | after "foo"  | "auto"    | "end"           | "foobarbaz"   |
      | after "foo"  | "auto"    | "none"          | "foobazbar"   |
      | before "foo" | "before"  | "start"         | "bazbar\|foo" |
      | before "foo" | "before"  | "end"           | "barbaz\|foo" |
      | before "foo" | "before"  | "none"          | "bar\|bazfoo" |
      | before "foo" | "after"   | "start"         | "foo\|bazbar" |
      | before "foo" | "after"   | "end"           | "foo\|barbaz" |
      | before "foo" | "after"   | "none"          | "bazfoo\|bar" |
      | before "foo" | "auto"    | "start"         | "bazbarfoo"   |
      | before "foo" | "auto"    | "end"           | "barbazfoo"   |
      | before "foo" | "auto"    | "none"          | "barbazfoo"   |
      | after "f"    | "before"  | "start"         | "bazbar\|foo" |
      | after "f"    | "before"  | "end"           | "barbaz\|foo" |
      | after "f"    | "before"  | "none"          | "bar\|fbazoo" |
      | after "f"    | "after"   | "start"         | "foo\|bazbar" |
      | after "f"    | "after"   | "end"           | "foo\|barbaz" |
      | after "f"    | "after"   | "none"          | "fbazoo\|bar" |
      | after "f"    | "auto"    | "start"         | "fbazbaroo"   |
      | after "f"    | "auto"    | "end"           | "fbarbazoo"   |
      | after "f"    | "auto"    | "none"          | "fbazbaroo"   |

  Scenario Outline: Inserting inline object on block object
    When a block is inserted "auto"
      ```
      {
        "_type": "image"
      }
      ```
    And a block is inserted <placement>
      ```
      {
        "_type": "block",
        "children": [{"_type": "stock-ticker"}]
      }
      ```
    Then the text is <text>

    Examples:
      | placement | text                        |
      | "before"  | ",[stock-ticker],\|[image]" |
      | "after"   | "[image]\|,[stock-ticker]," |
      | "auto"    | "[image]\|,[stock-ticker]," |
