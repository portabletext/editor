Feature: Insert Block

  Background:
    Given one editor

  Scenario Outline: Inserting block object on an empty editor without selecting it
    When "{image}" is inserted at <placement> and selected at the "none"
    Then the editor state is <text>
    And nothing is selected

    Examples:
      | placement | text           |
      | "before"  | "{IMAGE};;B: " |
      | "after"   | "B: ;;{IMAGE}" |
      | "auto"    | "{IMAGE}"      |

  Scenario Outline: Inserting block object on an empty editor and selecting it
    When the editor is focused
    And "{image}" is inserted at <placement> and selected at the <position>
    And "bar" is typed
    Then the editor state is <text>

    Examples:
      | placement | position | text              |
      | "before"  | "start"  | "^{IMAGE}\|;;B: " |
      | "after"   | "start"  | "B: ;;^{IMAGE}\|" |
      | "auto"    | "start"  | "^{IMAGE}\|"      |
      | "before"  | "end"    | "^{IMAGE}\|;;B: " |
      | "after"   | "end"    | "B: ;;^{IMAGE}\|" |
      | "auto"    | "end"    | "^{IMAGE}\|"      |

  Scenario Outline: Inserting block object on an empty text block
    Given the editor state is "B: f"
    When the editor is focused
    And "{Backspace}" is pressed
    And "{image}" is inserted at <placement> and selected at the <position>
    And "bar" is typed
    Then the editor state is <text>

    Examples:
      | placement | position | text                |
      | "before"  | "none"   | "{IMAGE};;B: bar\|" |
      | "after"   | "none"   | "B: bar\|;;{IMAGE}" |
      | "auto"    | "none"   | "^{IMAGE}\|"        |
      | "before"  | "start"  | "^{IMAGE}\|;;B: "   |
      | "after"   | "start"  | "B: ;;^{IMAGE}\|"   |
      | "auto"    | "start"  | "^{IMAGE}\|"        |
      | "before"  | "end"    | "^{IMAGE}\|;;B: "   |
      | "after"   | "end"    | "B: ;;^{IMAGE}\|"   |
      | "auto"    | "end"    | "^{IMAGE}\|"        |

  Scenario Outline: Inserting block object on empty heading
    When "h1:" is inserted at "auto" and selected at the "none"
    When "{image}" is inserted at <placement> and selected at the "none"
    Then the editor state is <text>

    Examples:
      | placement | text                        |
      | "auto"    | "{IMAGE}"                   |
      | "before"  | "{IMAGE};;B style=\"h1\": " |
      | "after"   | "B style=\"h1\": ;;{IMAGE}" |

  Scenario Outline: Inserting block object on empty list item
    When ">-:" is inserted at "auto" and selected at the "none"
    When "{image}" is inserted at <placement> and selected at the "none"
    Then the editor state is <text>

    Examples:
      | placement | text                               |
      | "auto"    | "{IMAGE}"                          |
      | "before"  | "{IMAGE};;B listItem=\"bullet\": " |
      | "after"   | "B listItem=\"bullet\": ;;{IMAGE}" |

  Scenario Outline: Inserting and selecting block object on text selection
    Given the editor state is "B: foo"
    When <selection> is selected
    And "{image}" is inserted at <placement> and selected at the <position>
    Then the editor state is <text>
    And "{image}" is selected

    Examples:
      | selection | placement | position | text                 |
      | "foo"     | "auto"    | "start"  | "^{IMAGE}\|"         |
      | "f"       | "auto"    | "start"  | "^{IMAGE}\|;;B: oo"  |
      | "oo"      | "auto"    | "start"  | "B: f;;^{IMAGE}\|"   |
      | "foo"     | "auto"    | "end"    | "^{IMAGE}\|"         |
      | "f"       | "auto"    | "end"    | "^{IMAGE}\|;;B: oo"  |
      | "oo"      | "auto"    | "end"    | "B: f;;^{IMAGE}\|"   |
      | "foo"     | "before"  | "start"  | "^{IMAGE}\|;;B: foo" |
      | "f"       | "before"  | "start"  | "^{IMAGE}\|;;B: foo" |
      | "oo"      | "before"  | "start"  | "^{IMAGE}\|;;B: foo" |
      | "foo"     | "before"  | "end"    | "^{IMAGE}\|;;B: foo" |
      | "f"       | "before"  | "end"    | "^{IMAGE}\|;;B: foo" |
      | "oo"      | "before"  | "end"    | "^{IMAGE}\|;;B: foo" |
      | "foo"     | "after"   | "start"  | "B: foo;;^{IMAGE}\|" |
      | "f"       | "after"   | "start"  | "B: foo;;^{IMAGE}\|" |
      | "oo"      | "after"   | "start"  | "B: foo;;^{IMAGE}\|" |
      | "foo"     | "after"   | "end"    | "B: foo;;^{IMAGE}\|" |
      | "f"       | "after"   | "end"    | "B: foo;;^{IMAGE}\|" |
      | "oo"      | "after"   | "end"    | "B: foo;;^{IMAGE}\|" |

  Scenario Outline: Inserting block object on text selection without selecting it
    Given the editor state is "B: foo"
    When the editor is focused
    And <selection> is selected
    And "{image}" is inserted at <placement> and selected at the "none"
    And "bar" is typed
    Then the editor state is <text>

    Examples:
      | selection | placement | text                  |
      | "f"       | "auto"    | "{IMAGE};;B: bar\|oo" |
      | "oo"      | "auto"    | "B: fbar\|;;{IMAGE}"  |
      | "foo"     | "auto"    | "^{IMAGE}\|"          |
      | "f"       | "before"  | "{IMAGE};;B: bar\|oo" |
      | "oo"      | "before"  | "{IMAGE};;B: fbar\|"  |
      | "foo"     | "before"  | "{IMAGE};;B: bar\|"   |
      | "f"       | "after"   | "B: bar\|oo;;{IMAGE}" |
      | "oo"      | "after"   | "B: fbar\|;;{IMAGE}"  |
      | "foo"     | "after"   | "B: bar\|;;{IMAGE}"   |

  Scenario Outline: Inserting and selecting block object on cross-block selection
    Given the editor state is "B: foo"
    When the editor is focused
    And "{Enter}" is pressed
    And "bar" is typed
    And <selection> is selected
    And "{image}" is inserted at <placement> and selected at the <position>
    Then the editor state is <text>
    And "{image}" is selected

    Examples:
      | selection | placement | position | text                         |
      | "foob"    | "auto"    | "start"  | "^{IMAGE}\|;;B: ar"          |
      | "obar"    | "auto"    | "start"  | "B: fo;;^{IMAGE}\|"          |
      | "foob"    | "auto"    | "end"    | "^{IMAGE}\|;;B: ar"          |
      | "foob"    | "before"  | "start"  | "^{IMAGE}\|;;B: foo;;B: bar" |
      | "obar"    | "before"  | "start"  | "^{IMAGE}\|;;B: foo;;B: bar" |
      | "foob"    | "before"  | "end"    | "^{IMAGE}\|;;B: foo;;B: bar" |
      | "obar"    | "before"  | "end"    | "^{IMAGE}\|;;B: foo;;B: bar" |
      | "foob"    | "after"   | "start"  | "B: foo;;B: bar;;^{IMAGE}\|" |
      | "obar"    | "after"   | "start"  | "B: foo;;B: bar;;^{IMAGE}\|" |
      | "foob"    | "after"   | "end"    | "B: foo;;B: bar;;^{IMAGE}\|" |
      | "obar"    | "after"   | "end"    | "B: foo;;B: bar;;^{IMAGE}\|" |

  Scenario Outline: Inserting a block object on a cross-block selection without selecting it
    Given the editor state is "B: foo"
    When the editor is focused
    And "{Enter}" is pressed
    And "bar" is typed
    And <selection> is selected
    And "{image}" is inserted at <placement> and selected at the "none"
    And "baz" is typed
    Then the editor state is <text>

    Examples:
      | selection | placement | text                  |
      | "foob"    | "auto"    | "{IMAGE};;B: baz\|ar" |
      | "obar"    | "auto"    | "B: fobaz\|;;{IMAGE}" |
      | "foobar"  | "auto"    | "^{IMAGE}\|"          |

  Scenario Outline: Inserting text block on an empty editor
    When "foo" is inserted at <placement> and selected at the "none"
    Then the editor state is <text>
    And nothing is selected

    Examples:
      | placement | text          |
      | "before"  | "B: foo;;B: " |
      | "after"   | "B: ;;B: foo" |
      | "auto"    | "B: foo"      |

  Scenario Outline: Inserting and selecting text block on an empty editor
    When the editor is focused
    When "foo" is inserted at <placement> and selected at the <position>
    And "bar" is typed
    Then the editor state is <text>

    Examples:
      | placement | position | text               |
      | "before"  | "start"  | "B: bar\|foo;;B: " |
      | "before"  | "end"    | "B: foobar\|;;B: " |
      | "before"  | "none"   | "B: foo;;B: bar\|" |
      | "after"   | "start"  | "B: ;;B: bar\|foo" |
      | "after"   | "end"    | "B: ;;B: foobar\|" |
      | "after"   | "none"   | "B: bar\|;;B: foo" |
      | "auto"    | "start"  | "B: bar\|foo"      |
      | "auto"    | "end"    | "B: foobar\|"      |
      | "auto"    | "none"   | "B: bar\|foo"      |

  Scenario Outline: Inserting and selecting text block on an empty selected editor
    When the editor is focused
    And "foo" is inserted at <placement> and selected at the <position>
    And "bar" is typed
    Then the editor state is <text>

    Examples:
      | placement | position | text               |
      | "before"  | "start"  | "B: bar\|foo;;B: " |
      | "before"  | "end"    | "B: foobar\|;;B: " |
      | "before"  | "none"   | "B: foo;;B: bar\|" |
      | "after"   | "start"  | "B: ;;B: bar\|foo" |
      | "after"   | "end"    | "B: ;;B: foobar\|" |
      | "after"   | "none"   | "B: bar\|;;B: foo" |
      | "auto"    | "start"  | "B: bar\|foo"      |
      | "auto"    | "end"    | "B: foobar\|"      |
      | "auto"    | "none"   | "B: bar\|foo"      |

  Scenario Outline: Inserting block object on block object
    When "{image}" is inserted at "auto" and selected at the <block selection>
    And "{break}" is inserted at <new block placement> and selected at the <new block selection>
    Then the editor state is <text>
    And <selection> is selected

    Examples:
      | block selection | new block placement | new block selection | text                  | selection |
      | "start"         | "before"            | "start"             | "^{BREAK}\|;;{IMAGE}" | "{break}" |
      | "start"         | "before"            | "end"               | "^{BREAK}\|;;{IMAGE}" | "{break}" |
      | "start"         | "before"            | "none"              | "{BREAK};;^{IMAGE}\|" | "{image}" |
      | "end"           | "before"            | "start"             | "^{BREAK}\|;;{IMAGE}" | "{break}" |
      | "end"           | "before"            | "end"               | "^{BREAK}\|;;{IMAGE}" | "{break}" |
      | "end"           | "before"            | "none"              | "{BREAK};;^{IMAGE}\|" | "{image}" |
      | "none"          | "before"            | "start"             | "^{BREAK}\|;;{IMAGE}" | "{break}" |
      | "none"          | "after"             | "start"             | "{IMAGE};;^{BREAK}\|" | "{break}" |
      | "none"          | "auto"              | "start"             | "{IMAGE};;^{BREAK}\|" | "{break}" |
      | "none"          | "before"            | "end"               | "^{BREAK}\|;;{IMAGE}" | "{break}" |
      | "none"          | "after"             | "end"               | "{IMAGE};;^{BREAK}\|" | "{break}" |
      | "none"          | "auto"              | "end"               | "{IMAGE};;^{BREAK}\|" | "{break}" |
      | "none"          | "before"            | "none"              | "{BREAK};;{IMAGE}"    | nothing   |
      | "none"          | "after"             | "none"              | "{IMAGE};;{BREAK}"    | nothing   |
      | "none"          | "auto"              | "none"              | "{IMAGE};;{BREAK}"    | nothing   |

  Scenario Outline: Inserting and selecting block object on block object
    Given the editor state is "{IMAGE}"
    When "{break}" is inserted at <placement> and selected at the <position>
    Then <selection> is selected

    Examples:
      | placement | position | selection |
      | "before"  | "start"  | "{break}" |
      | "before"  | "end"    | "{break}" |
      | "before"  | "none"   | "{image}" |
      | "after"   | "start"  | "{break}" |
      | "after"   | "end"    | "{break}" |
      | "after"   | "none"   | "{image}" |
      | "auto"    | "start"  | "{break}" |
      | "auto"    | "end"    | "{break}" |
      | "auto"    | "none"   | "{image}" |

  Scenario Outline: Inserting block object on block objects
    Given the editor state is
      """
      {IMAGE}
      {IMAGE}
      """
    When the editor is focused
    And everything is selected
    And "{break}" is inserted at <placement> and selected at the <position>
    And "{Enter}" is pressed
    And "foo" is typed
    Then the editor state is <text>

    Examples:
      | placement | position | text                                  |
      | "before"  | "start"  | "{BREAK};;B: foo\|;;{IMAGE};;{IMAGE}" |
      | "before"  | "end"    | "{BREAK};;B: foo\|;;{IMAGE};;{IMAGE}" |
      | "before"  | "none"   | "{BREAK};;B: foo\|"                   |
      | "after"   | "start"  | "{IMAGE};;{IMAGE};;{BREAK};;B: foo\|" |
      | "after"   | "end"    | "{IMAGE};;{IMAGE};;{BREAK};;B: foo\|" |
      | "after"   | "none"   | "B: foo\|;;{BREAK}"                   |

  Scenario Outline: Inserting block object on text block
    Given the editor state is "B: foo"
    When the editor is focused
    And "{Enter}" is pressed
    And "bar" is typed
    And the caret is put <position>
    And "{image}" is inserted at <placement> and selected at the "none"
    And "baz" is typed
    Then the editor state is <text>

    Examples:
      | position     | placement | text                                |
      | before "foo" | "before"  | "{IMAGE};;B: baz\|foo;;B: bar"      |
      | after "f"    | "before"  | "{IMAGE};;B: fbaz\|oo;;B: bar"      |
      | after "foo"  | "before"  | "{IMAGE};;B: foobaz\|;;B: bar"      |
      | before "foo" | "after"   | "B: baz\|foo;;{IMAGE};;B: bar"      |
      | after "f"    | "after"   | "B: fbaz\|oo;;{IMAGE};;B: bar"      |
      | after "foo"  | "after"   | "B: foobaz\|;;{IMAGE};;B: bar"      |
      | before "foo" | "auto"    | "{IMAGE};;B: baz\|foo;;B: bar"      |
      | after "f"    | "auto"    | "B: fbaz\|;;{IMAGE};;B: oo;;B: bar" |
      | after "foo"  | "auto"    | "B: foobaz\|;;{IMAGE};;B: bar"      |

  Scenario Outline: Inserting text block on block object
    When "{image}" is inserted at "auto" and selected at the "none"
    When "foo" is inserted at <placement> and selected at the "none"
    Then the editor state is <text>
    And nothing is selected

    Examples:
      | placement | text              |
      | "before"  | "B: foo;;{IMAGE}" |
      | "after"   | "{IMAGE};;B: foo" |
      | "auto"    | "{IMAGE};;B: foo" |

  Scenario Outline: Inserting text block on text block
    Given the editor state is "B: foo"
    When the caret is put <position>
    And "bar" is inserted at <placement> and selected at the "none"
    Then the editor state is <text>
    And the caret is <position>

    Examples:
      | position     | placement | text               |
      | after "foo"  | "before"  | "B: bar;;B: foo\|" |
      | after "foo"  | "after"   | "B: foo\|;;B: bar" |
      | after "foo"  | "auto"    | "B: foo\|bar"      |
      | before "foo" | "before"  | "B: bar;;B: \|foo" |
      | before "foo" | "after"   | "B: \|foo;;B: bar" |
      | before "foo" | "auto"    | "B: bar\|foo"      |
      | after "f"    | "before"  | "B: bar;;B: f\|oo" |
      | after "f"    | "after"   | "B: f\|oo;;B: bar" |
      | after "f"    | "auto"    | "B: f\|baroo"      |

  Scenario Outline: Inserting and selecting text block on text block
    Given the editor state is "B: foo"
    When the editor is focused
    And the caret is put <position>
    And "bar" is inserted at <placement> and selected at the <select-position>
    And "baz" is typed
    Then the editor state is <text>

    Examples:
      | position     | placement | select-position | text                  |
      | after "foo"  | "before"  | "start"         | "B: baz\|bar;;B: foo" |
      | after "foo"  | "before"  | "end"           | "B: barbaz\|;;B: foo" |
      | after "foo"  | "before"  | "none"          | "B: bar;;B: foobaz\|" |
      | after "foo"  | "after"   | "start"         | "B: foo;;B: baz\|bar" |
      | after "foo"  | "after"   | "end"           | "B: foo;;B: barbaz\|" |
      | after "foo"  | "after"   | "none"          | "B: foobaz\|;;B: bar" |
      | after "foo"  | "auto"    | "start"         | "B: foobaz\|bar"      |
      | after "foo"  | "auto"    | "end"           | "B: foobarbaz\|"      |
      | after "foo"  | "auto"    | "none"          | "B: foobaz\|bar"      |
      | before "foo" | "before"  | "start"         | "B: baz\|bar;;B: foo" |
      | before "foo" | "before"  | "end"           | "B: barbaz\|;;B: foo" |
      | before "foo" | "before"  | "none"          | "B: bar;;B: baz\|foo" |
      | before "foo" | "after"   | "start"         | "B: foo;;B: baz\|bar" |
      | before "foo" | "after"   | "end"           | "B: foo;;B: barbaz\|" |
      | before "foo" | "after"   | "none"          | "B: baz\|foo;;B: bar" |
      | before "foo" | "auto"    | "start"         | "B: baz\|barfoo"      |
      | before "foo" | "auto"    | "end"           | "B: barbaz\|foo"      |
      | before "foo" | "auto"    | "none"          | "B: barbaz\|foo"      |
      | after "f"    | "before"  | "start"         | "B: baz\|bar;;B: foo" |
      | after "f"    | "before"  | "end"           | "B: barbaz\|;;B: foo" |
      | after "f"    | "before"  | "none"          | "B: bar;;B: fbaz\|oo" |
      | after "f"    | "after"   | "start"         | "B: foo;;B: baz\|bar" |
      | after "f"    | "after"   | "end"           | "B: foo;;B: barbaz\|" |
      | after "f"    | "after"   | "none"          | "B: fbaz\|oo;;B: bar" |
      | after "f"    | "auto"    | "start"         | "B: fbaz\|baroo"      |
      | after "f"    | "auto"    | "end"           | "B: fbarbaz\|oo"      |
      | after "f"    | "auto"    | "none"          | "B: fbaz\|baroo"      |

  Scenario Outline: Inserting text block on text selection
    Given the editor state is "B: foo"
    When the editor is focused
    And <selection> is selected
    And "bar" is inserted at <placement> and selected at the <position>
    And "baz" is typed
    Then the editor state is <text>

    Examples:
      | selection | placement | position | text                  |
      | "foo"     | "before"  | "start"  | "B: baz\|bar;;B: foo" |
      | "f"       | "before"  | "start"  | "B: baz\|bar;;B: foo" |
      | "oo"      | "before"  | "start"  | "B: baz\|bar;;B: foo" |
      | "foo"     | "before"  | "end"    | "B: barbaz\|;;B: foo" |
      | "f"       | "before"  | "end"    | "B: barbaz\|;;B: foo" |
      | "oo"      | "before"  | "end"    | "B: barbaz\|;;B: foo" |
      | "foo"     | "after"   | "start"  | "B: foo;;B: baz\|bar" |
      | "f"       | "after"   | "start"  | "B: foo;;B: baz\|bar" |
      | "oo"      | "after"   | "start"  | "B: foo;;B: baz\|bar" |
      | "foo"     | "after"   | "end"    | "B: foo;;B: barbaz\|" |
      | "f"       | "after"   | "end"    | "B: foo;;B: barbaz\|" |
      | "oo"      | "after"   | "end"    | "B: foo;;B: barbaz\|" |
      | "foo"     | "auto"    | "start"  | "B: baz\|bar"         |
      | "f"       | "auto"    | "start"  | "B: baz\|baroo"       |
      | "oo"      | "auto"    | "start"  | "B: fbaz\|bar"        |
      | "foo"     | "auto"    | "end"    | "B: barbaz\|"         |
      | "f"       | "auto"    | "end"    | "B: barbaz\|oo"       |
      | "oo"      | "auto"    | "end"    | "B: fbarbaz\|"        |

  Scenario Outline: Inserting text block on cross-block text selection
    Given the editor state is "B: foo"
    When the editor is focused
    And "{Enter}" is pressed
    And "bar" is typed
    And <selection> is selected
    And "baz" is inserted at <placement> and selected at the <position>
    And "new" is typed
    Then the editor state is <text>

    Examples:
      | selection | placement | position | text                          |
      | "foob"    | "before"  | "start"  | "B: new\|baz;;B: foo;;B: bar" |
      | "obar"    | "before"  | "start"  | "B: new\|baz;;B: foo;;B: bar" |
      | "foob"    | "before"  | "end"    | "B: baznew\|;;B: foo;;B: bar" |
      | "obar"    | "before"  | "end"    | "B: baznew\|;;B: foo;;B: bar" |
      | "foob"    | "before"  | "none"   | "B: baz;;B: new\|ar"          |
      | "obar"    | "before"  | "none"   | "B: baz;;B: fonew\|"          |
      | "foob"    | "after"   | "start"  | "B: foo;;B: bar;;B: new\|baz" |
      | "obar"    | "after"   | "start"  | "B: foo;;B: bar;;B: new\|baz" |
      | "foob"    | "after"   | "end"    | "B: foo;;B: bar;;B: baznew\|" |
      | "obar"    | "after"   | "end"    | "B: foo;;B: bar;;B: baznew\|" |
      | "foob"    | "after"   | "none"   | "B: new\|ar;;B: baz"          |
      # Fails on Firefox
      # | "obar"    | "after"   | "none"   | "B: fonew;;B: baz"           |
      | "foob"    | "auto"    | "start"  | "B: new\|bazar"               |
      | "obar"    | "auto"    | "start"  | "B: fonew\|baz"               |
      | "foob"    | "auto"    | "end"    | "B: baznew\|ar"               |
      | "obar"    | "auto"    | "end"    | "B: fobaznew\|"               |
      | "foob"    | "auto"    | "none"   | "B: new\|bazar"               |
      | "obar"    | "auto"    | "none"   | "B: fonew\|baz"               |

  Scenario Outline: Inserting inline object on block object
    When "{image}" is inserted at "auto"
    And ",{stock-ticker}," is inserted at <placement>
    Then the editor state is <text>

    Examples:
      | placement | text                           |
      | "before"  | "B: {stock-ticker}\|;;{IMAGE}" |
      | "after"   | "{IMAGE};;B: {stock-ticker}\|" |
      | "auto"    | "{IMAGE};;B: {stock-ticker}\|" |

  Scenario Outline: Inserting block object on inline object
    When ",{stock-ticker}," is inserted at "auto"
    And "{image}" is inserted at <placement>
    Then the editor state is <text>

    Examples:
      | placement | text                            |
      | "before"  | "^{IMAGE}\|;;B: {stock-ticker}" |
      | "after"   | "B: {stock-ticker};;^{IMAGE}\|" |
      | "auto"    | "B: {stock-ticker};;^{IMAGE}\|" |

  Scenario Outline: Inserting text block on inline object
    When ",{stock-ticker}," is inserted at "auto"
    And "foo" is inserted at <placement> and selected at the <select position>
    Then the editor state is <text>

    Examples:
      | placement | select position | text                          |
      | "before"  | "end"           | "B: foo\|;;B: {stock-ticker}" |
      | "after"   | "start"         | "B: {stock-ticker};;B: \|foo" |
      | "auto"    | "start"         | "B: {stock-ticker}\|foo"      |
