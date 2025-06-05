Feature: Insert Block

  Background:
    Given one editor

  Scenario Outline: Inserting block object on an empty editor without selecting it
    When a block is inserted <placement> and selected at the "none"
      ```
      {
        "_type": "image"
      }
      ```
    Then the text is <text>
    And nothing is selected

    Examples:
      | placement | text        |
      | "before"  | "[image]\|" |
      | "after"   | "\|[image]" |
      | "auto"    | "[image]"   |

  Scenario Outline: Inserting block object on an empty editor and selecting it
    When a block is inserted <placement> and selected at the <position>
      ```
      {
        "_type": "image"
      }
      ```
    And "bar" is typed
    Then the text is <text>

    Examples:
      | placement | position | text        |
      | "before"  | "start"  | "[image]\|" |
      | "after"   | "start"  | "\|[image]" |
      | "auto"    | "start"  | "[image]"   |
      | "before"  | "end"    | "[image]\|" |
      | "after"   | "end"    | "\|[image]" |
      | "auto"    | "end"    | "[image]"   |

  Scenario Outline: Inserting block object on an empty text block
    Given the text "f"
    When "{Backspace}" is pressed
    And a block is inserted <placement> and selected at the <position>
      ```
      {
        "_type": "image"
      }
      ```
    And "bar" is typed
    Then the text is <text>

    Examples:
      | placement | position | text           |
      | "before"  | "none"   | "[image]\|bar" |
      | "after"   | "none"   | "bar\|[image]" |
      | "auto"    | "none"   | "[image]"      |
      | "before"  | "start"  | "[image]\|"    |
      | "after"   | "start"  | "\|[image]"    |
      | "auto"    | "start"  | "[image]"      |
      | "before"  | "end"    | "[image]\|"    |
      | "after"   | "end"    | "\|[image]"    |
      | "auto"    | "end"    | "[image]"      |

  Scenario Outline: Inserting and selecting block object on text selection
    Given the text "foo"
    When <selection> is selected
    And a block is inserted <placement> and selected at the <position>
      ```
      {
        "_key": "k-i",
        "_type": "image"
      }
      ```
    Then the text is <text>
    And block "k-i" is selected

    Examples:
      | selection | placement | position | text           |
      | "foo"     | "auto"    | "start"  | "[image]"      |
      | "f"       | "auto"    | "start"  | "[image]\|oo"  |
      | "oo"      | "auto"    | "start"  | "f\|[image]"   |
      | "foo"     | "auto"    | "end"    | "[image]"      |
      | "f"       | "auto"    | "end"    | "[image]\|oo"  |
      | "oo"      | "auto"    | "end"    | "f\|[image]"   |
      | "foo"     | "before"  | "start"  | "[image]\|foo" |
      | "f"       | "before"  | "start"  | "[image]\|foo" |
      | "oo"      | "before"  | "start"  | "[image]\|foo" |
      | "foo"     | "before"  | "end"    | "[image]\|foo" |
      | "f"       | "before"  | "end"    | "[image]\|foo" |
      | "oo"      | "before"  | "end"    | "[image]\|foo" |
      | "foo"     | "after"   | "start"  | "foo\|[image]" |
      | "f"       | "after"   | "start"  | "foo\|[image]" |
      | "oo"      | "after"   | "start"  | "foo\|[image]" |
      | "foo"     | "after"   | "end"    | "foo\|[image]" |
      | "f"       | "after"   | "end"    | "foo\|[image]" |
      | "oo"      | "after"   | "end"    | "foo\|[image]" |

  Scenario Outline: Inserting block object on text selection without selecting it
    Given the text "foo"
    When <selection> is selected
    And a block is inserted <placement> and selected at the "none"
      ```
      {
        "_type": "image"
      }
      ```
    And "bar" is typed
    Then the text is <text>

    Examples:
      | selection | placement | text             |
      | "f"       | "auto"    | "[image]\|baroo" |
      | "oo"      | "auto"    | "fbar\|[image]"  |
      | "foo"     | "auto"    | "[image]"        |
      | "f"       | "before"  | "[image]\|baroo" |
      | "oo"      | "before"  | "[image]\|fbar"  |
      | "foo"     | "before"  | "[image]\|bar"   |
      | "f"       | "after"   | "baroo\|[image]" |
      | "oo"      | "after"   | "fbar\|[image]"  |
      | "foo"     | "after"   | "bar\|[image]"   |

  Scenario Outline: Inserting and selecting block object on cross-block selection
    Given the text "foo"
    When "{Enter}" is pressed
    And "bar" is typed
    And <selection> is selected
    And a block is inserted <placement> and selected at the <position>
      ```
      {
        "_key": "k-i",
        "_type": "image"
      }
      ```
    Then the text is <text>
    And block "k-i" is selected

    Examples:
      | selection | placement | position | text                |
      | "foob"    | "auto"    | "start"  | "[image]\|ar"       |
      | "obar"    | "auto"    | "start"  | "fo\|[image]"       |
      | "foob"    | "auto"    | "end"    | "[image]\|ar"       |
      | "foob"    | "before"  | "start"  | "[image]\|foo\|bar" |
      | "obar"    | "before"  | "start"  | "[image]\|foo\|bar" |
      | "foob"    | "before"  | "end"    | "[image]\|foo\|bar" |
      | "obar"    | "before"  | "end"    | "[image]\|foo\|bar" |
      | "foob"    | "after"   | "start"  | "foo\|bar\|[image]" |
      | "obar"    | "after"   | "start"  | "foo\|bar\|[image]" |
      | "foob"    | "after"   | "end"    | "foo\|bar\|[image]" |
      | "obar"    | "after"   | "end"    | "foo\|bar\|[image]" |

  Scenario Outline: Inserting a block object on a cross-block selection without selecting it
    Given the text "foo"
    When "{Enter}" is pressed
    And "bar" is typed
    And <selection> is selected
    And a block is inserted <placement> and selected at the "none"
      ```
      {
        "_type": "image"
      }
      ```
    And "baz" is typed
    Then the text is <text>

    Examples:
      | selection | placement | text             |
      | "foob"    | "auto"    | "[image]\|bazar" |
      | "obar"    | "auto"    | "fobaz\|[image]" |
      | "foobar"  | "auto"    | "[image]"        |

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

  Scenario Outline: Inserting and selecting text block on an empty selected editor
    Given the editor is focused
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
      | "before"  | "none"   | "foo\|bar" |
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
    And "{Enter}" is pressed
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

  Scenario Outline: Inserting block object on block objects
    Given a block "auto"
      ```
      {
        "_type": "image"
      }
      ```
    And a block at "auto" selected at the "start"
      ```
      {
        "_type": "image"
      }
      ```
    When everything is selected
    When a block is inserted <placement> and selected at the <position>
      ```
      {
        "_type": "break"
      }
      ```
    And "{Enter}" is pressed
    And "foo" is typed
    Then the text is <text>

    Examples:
      | placement | position | text                             |
      | "before"  | "start"  | "[break]\|foo\|[image]\|[image]" |
      | "before"  | "end"    | "[break]\|foo\|[image]\|[image]" |
      | "before"  | "none"   | "[break]\|foo"                   |
      | "after"   | "start"  | "[image]\|[image]\|[break]\|foo" |
      | "after"   | "end"    | "[image]\|[image]\|[break]\|foo" |
      | "after"   | "none"   | "foo\|[break]"                   |

  Scenario Outline: Inserting block object on text block
    Given the text "foo"
    When "{Enter}" is pressed
    And "bar" is typed
    And the caret is put <position>
    And a block is inserted <placement> and selected at the "none"
      ```
      {
        "_type": "image"
      }
      ```
    And "baz" is typed
    Then the text is <text>

    Examples:
      | position     | placement | text                     |
      | before "foo" | "before"  | "[image]\|bazfoo\|bar"   |
      | after "f"    | "before"  | "[image]\|fbazoo\|bar"   |
      | after "foo"  | "before"  | "[image]\|foobaz\|bar"   |
      | before "foo" | "after"   | "bazfoo\|[image]\|bar"   |
      | after "f"    | "after"   | "fbazoo\|[image]\|bar"   |
      | after "foo"  | "after"   | "foobaz\|[image]\|bar"   |
      | before "foo" | "auto"    | "[image]\|bazfoo\|bar"   |
      | after "f"    | "auto"    | "fbaz\|[image]\|oo\|bar" |
      | after "foo"  | "auto"    | "foobaz\|[image]\|bar"   |

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

  Scenario Outline: Inserting text block on text selection
    Given the text "foo"
    When <selection> is selected
    And a block is inserted <placement> and selected at the <position>
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "bar"}]
      }
      ```
    And "baz" is typed
    Then the text is <text>

    Examples:
      | selection | placement | position | text          |
      | "foo"     | "before"  | "start"  | "bazbar\|foo" |
      | "f"       | "before"  | "start"  | "bazbar\|foo" |
      | "oo"      | "before"  | "start"  | "bazbar\|foo" |
      | "foo"     | "before"  | "end"    | "barbaz\|foo" |
      | "f"       | "before"  | "end"    | "barbaz\|foo" |
      | "oo"      | "before"  | "end"    | "barbaz\|foo" |
      | "foo"     | "after"   | "start"  | "foo\|bazbar" |
      | "f"       | "after"   | "start"  | "foo\|bazbar" |
      | "oo"      | "after"   | "start"  | "foo\|bazbar" |
      | "foo"     | "after"   | "end"    | "foo\|barbaz" |
      | "f"       | "after"   | "end"    | "foo\|barbaz" |
      | "oo"      | "after"   | "end"    | "foo\|barbaz" |
      | "foo"     | "auto"    | "start"  | "bazbar"      |
      | "f"       | "auto"    | "start"  | "bazbaroo"    |
      | "oo"      | "auto"    | "start"  | "fbazbar"     |
      | "foo"     | "auto"    | "end"    | "barbaz"      |
      | "f"       | "auto"    | "end"    | "barbazoo"    |
      | "oo"      | "auto"    | "end"    | "fbarbaz"     |

  Scenario Outline: Inserting text block on cross-block text selection
    Given the text "foo"
    When "{Enter}" is pressed
    And "bar" is typed
    And <selection> is selected
    And a block is inserted <placement> and selected at the <position>
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "baz"}]
      }
      ```
    And "new" is typed
    Then the text is <text>

    Examples:
      | selection | placement | position | text               |
      | "foob"    | "before"  | "start"  | "newbaz\|foo\|bar" |
      | "obar"    | "before"  | "start"  | "newbaz\|foo\|bar" |
      | "foob"    | "before"  | "end"    | "baznew\|foo\|bar" |
      | "obar"    | "before"  | "end"    | "baznew\|foo\|bar" |
      | "foob"    | "before"  | "none"   | "baz\|newar"       |
      | "obar"    | "before"  | "none"   | "baz\|fonew"       |
      | "foob"    | "after"   | "start"  | "foo\|bar\|newbaz" |
      | "obar"    | "after"   | "start"  | "foo\|bar\|newbaz" |
      | "foob"    | "after"   | "end"    | "foo\|bar\|baznew" |
      | "obar"    | "after"   | "end"    | "foo\|bar\|baznew" |
      | "foob"    | "after"   | "none"   | "newar\|baz"       |
      | "obar"    | "after"   | "none"   | "fonew\|baz"       |
      | "foob"    | "auto"    | "start"  | "newbazar"         |
      | "obar"    | "auto"    | "start"  | "fonewbaz"         |
      | "foob"    | "auto"    | "end"    | "baznewar"         |
      | "obar"    | "auto"    | "end"    | "fobaznew"         |
      | "foob"    | "auto"    | "none"   | "newbazar"         |
      | "obar"    | "auto"    | "none"   | "fonewbaz"         |

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

  Scenario Outline: Inserting block object on inline object
    When a block is inserted "auto"
      ```
      {
        "_type": "block",
        "children": [{"_type": "stock-ticker"}]
      }
      ```
    And a block is inserted <placement>
      ```
      {
        "_type": "image"
      }
      ```
    Then the text is <text>

    Examples:
      | placement | text                        |
      | "before"  | "[image]\|,[stock-ticker]," |
      | "after"   | ",[stock-ticker],\|[image]" |
      | "auto"    | ",[stock-ticker],\|[image]" |

  Scenario Outline: Inserting text block on inline object
    When a block is inserted "auto"
      ```
      {
        "_type": "block",
        "children": [{"_type": "stock-ticker"}]
      }
      ```
    And a block is inserted <placement> and selected at the <select position>
      ```
      {
        "_type": "block",
        "children": [{"_type": "span", "text": "foo"}]
      }
      ```
    Then the text is <text>

    Examples:
      | placement | select position | text                    |
      | "before"  | "end"           | "foo\|,[stock-ticker]," |
      | "after"   | "start"         | ",[stock-ticker],\|foo" |
      | "auto"    | "start"         | ",[stock-ticker],foo"   |
