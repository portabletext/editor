Feature: Insert Block

Background:
  Given one editor

Scenario Outline: Inserting block object on an empty editor without selecting it
  When "{image}" is inserted at <placement> and selected at the "none"
  Then the text is <text>
  And nothing is selected

  Examples:
    | placement | text          |
    | "before"  | "{IMAGE};;P:" |
    | "after"   | "P:;;{IMAGE}" |
    | "auto"    | "{IMAGE}"     |

Scenario Outline: Inserting block object on an empty editor and selecting it
  When the editor is focused
  And "{image}" is inserted at <placement> and selected at the <position>
  And "bar" is typed
  Then the text is <text>

  Examples:
    | placement | position | text          |
    | "before"  | "start"  | "{IMAGE};;P:" |
    | "after"   | "start"  | "P:;;{IMAGE}" |
    | "auto"    | "start"  | "{IMAGE}"     |
    | "before"  | "end"    | "{IMAGE};;P:" |
    | "after"   | "end"    | "P:;;{IMAGE}" |
    | "auto"    | "end"    | "{IMAGE}"     |

Scenario Outline: Inserting block object on an empty text block
  Given the text "P: f"
  When the editor is focused
  And "{Backspace}" is pressed
  And "{image}" is inserted at <placement> and selected at the <position>
  And "bar" is typed
  Then the text is <text>

  Examples:
    | placement | position | text              |
    | "before"  | "none"   | "{IMAGE};;P: bar" |
    | "after"   | "none"   | "P: bar;;{IMAGE}" |
    | "auto"    | "none"   | "{IMAGE}"         |
    | "before"  | "start"  | "{IMAGE};;P:"     |
    | "after"   | "start"  | "P:;;{IMAGE}"     |
    | "auto"    | "start"  | "{IMAGE}"         |
    | "before"  | "end"    | "{IMAGE};;P:"     |
    | "after"   | "end"    | "P:;;{IMAGE}"     |
    | "auto"    | "end"    | "{IMAGE}"         |

Scenario Outline: Inserting block object on empty heading
  When "h1:" is inserted at "auto" and selected at the "none"
  When "{image}" is inserted at <placement> and selected at the "none"
  Then the text is <text>

  Examples:
    | placement | text              |
    | "auto"    | "{IMAGE}"         |
    | "before"  | "{IMAGE};;P: h1:" |
    | "after"   | "P: h1:;;{IMAGE}" |

Scenario Outline: Inserting block object on empty list item
  When ">-:" is inserted at "auto" and selected at the "none"
  When "{image}" is inserted at <placement> and selected at the "none"
  Then the text is <text>

  Examples:
    | placement | text              |
    | "auto"    | "{IMAGE}"         |
    | "before"  | "{IMAGE};;P: >-:" |
    | "after"   | "P: >-:;;{IMAGE}" |

Scenario Outline: Inserting and selecting block object on text selection
  Given the text "P: foo"
  When <selection> is selected
  And "{image}" is inserted at <placement> and selected at the <position>
  Then the text is <text>
  And "{image}" is selected

  Examples:
    | selection | placement | position | text              |
    | "foo"     | "auto"    | "start"  | "{IMAGE}"         |
    | "f"       | "auto"    | "start"  | "{IMAGE};;P: oo"  |
    | "oo"      | "auto"    | "start"  | "P: f;;{IMAGE}"   |
    | "foo"     | "auto"    | "end"    | "{IMAGE}"         |
    | "f"       | "auto"    | "end"    | "{IMAGE};;P: oo"  |
    | "oo"      | "auto"    | "end"    | "P: f;;{IMAGE}"   |
    | "foo"     | "before"  | "start"  | "{IMAGE};;P: foo" |
    | "f"       | "before"  | "start"  | "{IMAGE};;P: foo" |
    | "oo"      | "before"  | "start"  | "{IMAGE};;P: foo" |
    | "foo"     | "before"  | "end"    | "{IMAGE};;P: foo" |
    | "f"       | "before"  | "end"    | "{IMAGE};;P: foo" |
    | "oo"      | "before"  | "end"    | "{IMAGE};;P: foo" |
    | "foo"     | "after"   | "start"  | "P: foo;;{IMAGE}" |
    | "f"       | "after"   | "start"  | "P: foo;;{IMAGE}" |
    | "oo"      | "after"   | "start"  | "P: foo;;{IMAGE}" |
    | "foo"     | "after"   | "end"    | "P: foo;;{IMAGE}" |
    | "f"       | "after"   | "end"    | "P: foo;;{IMAGE}" |
    | "oo"      | "after"   | "end"    | "P: foo;;{IMAGE}" |

Scenario Outline: Inserting block object on text selection without selecting it
  Given the text "P: foo"
  When the editor is focused
  And <selection> is selected
  And "{image}" is inserted at <placement> and selected at the "none"
  And "bar" is typed
  Then the text is <text>

  Examples:
    | selection | placement | text              |
    | "f"       | "auto"    | "{IMAGE};;P: baroo" |
    | "oo"      | "auto"    | "P: fbar;;{IMAGE}" |
    | "foo"     | "auto"    | "{IMAGE}"         |
    | "f"       | "before"  | "{IMAGE};;P: baroo" |
    | "oo"      | "before"  | "{IMAGE};;P: fbar" |
    | "foo"     | "before"  | "{IMAGE};;P: bar" |
    | "f"       | "after"   | "P: baroo;;{IMAGE}" |
    | "oo"      | "after"   | "P: fbar;;{IMAGE}" |
    | "foo"     | "after"   | "P: bar;;{IMAGE}" |

Scenario Outline: Inserting and selecting block object on cross-block selection
  Given the text "P: foo"
  When the editor is focused
  And "{Enter}" is pressed
  And "bar" is typed
  And <selection> is selected
  And "{image}" is inserted at <placement> and selected at the <position>
  Then the text is <text>
  And "{image}" is selected

  Examples:
    | selection | placement | position | text                    |
    | "foob"    | "auto"    | "start"  | "{IMAGE};;P: ar"        |
    | "obar"    | "auto"    | "start"  | "P: fo;;{IMAGE}"        |
    | "foob"    | "auto"    | "end"    | "{IMAGE};;P: ar"        |
    | "foob"    | "before"  | "start"  | "{IMAGE};;P: foo;;P: bar" |
    | "obar"    | "before"  | "start"  | "{IMAGE};;P: foo;;P: bar" |
    | "foob"    | "before"  | "end"    | "{IMAGE};;P: foo;;P: bar" |
    | "obar"    | "before"  | "end"    | "{IMAGE};;P: foo;;P: bar" |
    | "foob"    | "after"   | "start"  | "P: foo;;P: bar;;{IMAGE}" |
    | "obar"    | "after"   | "start"  | "P: foo;;P: bar;;{IMAGE}" |
    | "foob"    | "after"   | "end"    | "P: foo;;P: bar;;{IMAGE}" |
    | "obar"    | "after"   | "end"    | "P: foo;;P: bar;;{IMAGE}" |

Scenario Outline: Inserting a block object on a cross-block selection without selecting it
  Given the text "P: foo"
  When the editor is focused
  And "{Enter}" is pressed
  And "bar" is typed
  And <selection> is selected
  And "{image}" is inserted at <placement> and selected at the "none"
  And "baz" is typed
  Then the text is <text>

  Examples:
    | selection | placement | text              |
    | "foob"    | "auto"    | "{IMAGE};;P: bazar" |
    | "obar"    | "auto"    | "P: fobaz;;{IMAGE}" |
    | "foobar"  | "auto"    | "{IMAGE}"         |

Scenario Outline: Inserting text block on an empty editor
  When "foo" is inserted at <placement> and selected at the "none"
  Then the text is <text>
  And nothing is selected

  Examples:
    | placement | text      |
    | "before"  | "P: foo;;P:" |
    | "after"   | "P:;;P: foo" |
    | "auto"    | "P: foo"  |

Scenario Outline: Inserting and selecting text block on an empty editor
  When the editor is focused
  When "foo" is inserted at <placement> and selected at the <position>
  And "bar" is typed
  Then the text is <text>

  Examples:
    | placement | position | text        |
    | "before"  | "start"  | "P: barfoo;;P:" |
    | "before"  | "end"    | "P: foobar;;P:" |
    | "before"  | "none"   | "P: foo;;P: bar" |
    | "after"   | "start"  | "P:;;P: barfoo" |
    | "after"   | "end"    | "P:;;P: foobar" |
    | "after"   | "none"   | "P: bar;;P: foo" |
    | "auto"    | "start"  | "P: barfoo" |
    | "auto"    | "end"    | "P: foobar" |
    | "auto"    | "none"   | "P: barfoo" |

Scenario Outline: Inserting and selecting text block on an empty selected editor
  When the editor is focused
  And "foo" is inserted at <placement> and selected at the <position>
  And "bar" is typed
  Then the text is <text>

  Examples:
    | placement | position | text        |
    | "before"  | "start"  | "P: barfoo;;P:" |
    | "before"  | "end"    | "P: foobar;;P:" |
    | "before"  | "none"   | "P: foo;;P: bar" |
    | "after"   | "start"  | "P:;;P: barfoo" |
    | "after"   | "end"    | "P:;;P: foobar" |
    | "after"   | "none"   | "P: bar;;P: foo" |
    | "auto"    | "start"  | "P: barfoo" |
    | "auto"    | "end"    | "P: foobar" |
    | "auto"    | "none"   | "P: barfoo" |

Scenario Outline: Inserting block object on block object
  When "{image}" is inserted at "auto" and selected at the <block>
  And "{break}" is inserted at <new> and selected at the <new>
  Then the text is <text>
  And <selection> is selected

  Examples:
    | block selection | new block placement | new block selection | text                  | selection     |
    | "start"         | "before"            | "start"             | "{BREAK};;{IMAGE}"    | "{break}"     |
    # | "start"         | "after"             | "start"             | "{image}\|{break}"    | block "k-b"   |
    # | "start"         | "auto"              | "start"             | "{image}\|{break}"    | block "k-b"   |
    | "start"         | "before"            | "end"               | "{BREAK};;{IMAGE}"    | "{break}"     |
    # | "start"         | "after"             | "end"               | "{image}\|{break}"    | block "k-b"   |
    # | "start"         | "auto"              | "end"               | "{image}\|{break}"    | block "k-b"   |
    | "start"         | "before"            | "none"              | "{BREAK};;{IMAGE}"    | "{image}"     |
    # | "start"         | "after"             | "none"              | "{image}\|{break}"    | block "k-i"   |
    # | "start"         | "auto"              | "none"              | "{image}\|{break}"    | block "k-i"   |
    # | "start"         | "after"             | "start"             | "{image}\|{break}"    | block "k-b"   |
    # | "start"         | "auto"              | "start"             | "{image}\|{break}"    | block "k-b"   |
    | "end"           | "before"            | "start"             | "{BREAK};;{IMAGE}"    | "{break}"     |
    | "end"           | "before"            | "end"               | "{BREAK};;{IMAGE}"    | "{break}"     |
    | "end"           | "before"            | "none"              | "{BREAK};;{IMAGE}"    | "{image}"     |
    | "none"          | "before"            | "start"             | "{BREAK};;{IMAGE}"    | "{break}"     |
    | "none"          | "after"             | "start"             | "{IMAGE};;{BREAK}"    | "{break}"     |
    | "none"          | "auto"              | "start"             | "{IMAGE};;{BREAK}"    | "{break}"     |
    | "none"          | "before"            | "end"               | "{BREAK};;{IMAGE}"    | "{break}"     |
    | "none"          | "after"             | "end"               | "{IMAGE};;{BREAK}"    | "{break}"     |
    | "none"          | "auto"              | "end"               | "{IMAGE};;{BREAK}"    | "{break}"     |
    | "none"          | "before"            | "none"              | "{BREAK};;{IMAGE}"    | nothing       |
    | "none"          | "after"             | "none"              | "{IMAGE};;{BREAK}"    | nothing       |
    | "none"          | "auto"              | "none"              | "{IMAGE};;{BREAK}"    | nothing       |

Scenario Outline: Inserting and selecting block object on block object
  Given the text "{IMAGE}"
  # When "{image}" is inserted at "auto" and selected at the "none"
  When "{break}" is inserted at <placement> and selected at the <position>
  Then <selection> is selected
  # When the editor is focused
  # And "{Enter}" is pressed
  # And "foo" is typed
  # Then the text is <text>

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
  Given the text "{IMAGE};;{IMAGE}"
  When the editor is focused
  And everything is selected
  And "{break}" is inserted at <placement> and selected at the <position>
  And "{Enter}" is pressed
  And "foo" is typed
  Then the text is <text>

  Examples:
    | placement | position | text                                |
    | "before"  | "start"  | "{BREAK};;P: foo;;{IMAGE};;{IMAGE}" |
    | "before"  | "end"    | "{BREAK};;P: foo;;{IMAGE};;{IMAGE}" |
    | "before"  | "none"   | "{BREAK};;P: foo"                   |
    | "after"   | "start"  | "{IMAGE};;{IMAGE};;{BREAK};;P: foo" |
    | "after"   | "end"    | "{IMAGE};;{IMAGE};;{BREAK};;P: foo" |
    | "after"   | "none"   | "P: foo;;{BREAK}"                   |

Scenario Outline: Inserting block object on text block
  Given the text "P: foo"
  When the editor is focused
  And "{Enter}" is pressed
  And "bar" is typed
  And the caret is put <position>
  And "{image}" is inserted at <placement> and selected at the "none"
  And "baz" is typed
  Then the text is <text>

  Examples:
    | position       | placement | text                        |
    | before "foo"   | "before"  | "{IMAGE};;P: bazfoo;;P: bar" |
    | after "f"      | "before"  | "{IMAGE};;P: fbazoo;;P: bar" |
    | after "foo"    | "before"  | "{IMAGE};;P: foobaz;;P: bar" |
    | before "foo"   | "after"   | "P: bazfoo;;{IMAGE};;P: bar" |
    | after "f"      | "after"   | "P: fbazoo;;{IMAGE};;P: bar" |
    | after "foo"    | "after"   | "P: foobaz;;{IMAGE};;P: bar" |
    | before "foo"   | "auto"    | "{IMAGE};;P: bazfoo;;P: bar" |
    | after "f"      | "auto"    | "P: fbaz;;{IMAGE};;P: oo;;P: bar" |
    | after "foo"    | "auto"    | "P: foobaz;;{IMAGE};;P: bar" |

Scenario Outline: Inserting text block on block object
  When "{image}" is inserted at "auto" and selected at the "none"
  When "foo" is inserted at <placement> and selected at the "none"
  Then the text is <text>
  And nothing is selected

  Examples:
    | placement | text              |
    | "before"  | "P: foo;;{IMAGE}" |
    | "after"   | "{IMAGE};;P: foo" |
    | "auto"    | "{IMAGE};;P: foo" |

Scenario Outline: Inserting text block on text block
  Given the text "P: foo"
  When the caret is put <position>
  And "bar" is inserted at <placement> and selected at the "none"
  Then the text is <text>
  And the caret is <position>

  Examples:
    | position     | placement | text      |
    | after "foo"  | "before"  | "P: bar;;P: foo" |
    | after "foo"  | "after"   | "P: foo;;P: bar" |
    | after "foo"  | "auto"    | "P: foobar" |
    | before "foo" | "before"  | "P: bar;;P: foo" |
    | before "foo" | "after"   | "P: foo;;P: bar" |
    | before "foo" | "auto"    | "P: barfoo" |
    | after "f"    | "before"  | "P: bar;;P: foo" |
    | after "f"    | "after"   | "P: foo;;P: bar" |
    | after "f"    | "auto"    | "P: fbaroo" |

Scenario Outline: Inserting and selecting text block on text block
  Given the text "P: foo"
  When the editor is focused
  And the caret is put <position>
  And "bar" is inserted at <placement> and selected at the <select-position>
  And "baz" is typed
  Then the text is <text>

  Examples:
    | position     | placement | select-position | text          |
    | after "foo"  | "before"  | "start"         | "P: bazbar;;P: foo" |
    | after "foo"  | "before"  | "end"           | "P: barbaz;;P: foo" |
    | after "foo"  | "before"  | "none"          | "P: bar;;P: foobaz" |
    | after "foo"  | "after"   | "start"         | "P: foo;;P: bazbar" |
    | after "foo"  | "after"   | "end"           | "P: foo;;P: barbaz" |
    | after "foo"  | "after"   | "none"          | "P: foobaz;;P: bar" |
    | after "foo"  | "auto"    | "start"         | "P: foobazbar" |
    | after "foo"  | "auto"    | "end"           | "P: foobarbaz" |
    | after "foo"  | "auto"    | "none"          | "P: foobazbar" |
    | before "foo" | "before"  | "start"         | "P: bazbar;;P: foo" |
    | before "foo" | "before"  | "end"           | "P: barbaz;;P: foo" |
    | before "foo" | "before"  | "none"          | "P: bar;;P: bazfoo" |
    | before "foo" | "after"   | "start"         | "P: foo;;P: bazbar" |
    | before "foo" | "after"   | "end"           | "P: foo;;P: barbaz" |
    | before "foo" | "after"   | "none"          | "P: bazfoo;;P: bar" |
    | before "foo" | "auto"    | "start"         | "P: bazbarfoo" |
    | before "foo" | "auto"    | "end"           | "P: barbazfoo" |
    | before "foo" | "auto"    | "none"          | "P: barbazfoo" |
    | after "f"    | "before"  | "start"         | "P: bazbar;;P: foo" |
    | after "f"    | "before"  | "end"           | "P: barbaz;;P: foo" |
    | after "f"    | "before"  | "none"          | "P: bar;;P: fbazoo" |
    | after "f"    | "after"   | "start"         | "P: foo;;P: bazbar" |
    | after "f"    | "after"   | "end"           | "P: foo;;P: barbaz" |
    | after "f"    | "after"   | "none"          | "P: fbazoo;;P: bar" |
    | after "f"    | "auto"    | "start"         | "P: fbazbaroo" |
    | after "f"    | "auto"    | "end"           | "P: fbarbazoo" |
    | after "f"    | "auto"    | "none"          | "P: fbazbaroo" |

Scenario Outline: Inserting text block on text selection
  Given the text "P: foo"
  When the editor is focused
  And <selection> is selected
  And "bar" is inserted at <placement> and selected at the <position>
  And "baz" is typed
  Then the text is <text>

  Examples:
    | selection | placement | position | text          |
    | "foo"     | "before"  | "start"  | "P: bazbar;;P: foo" |
    | "f"       | "before"  | "start"  | "P: bazbar;;P: foo" |
    | "oo"      | "before"  | "start"  | "P: bazbar;;P: foo" |
    | "foo"     | "before"  | "end"    | "P: barbaz;;P: foo" |
    | "f"       | "before"  | "end"    | "P: barbaz;;P: foo" |
    | "oo"      | "before"  | "end"    | "P: barbaz;;P: foo" |
    | "foo"     | "after"   | "start"  | "P: foo;;P: bazbar" |
    | "f"       | "after"   | "start"  | "P: foo;;P: bazbar" |
    | "oo"      | "after"   | "start"  | "P: foo;;P: bazbar" |
    | "foo"     | "after"   | "end"    | "P: foo;;P: barbaz" |
    | "f"       | "after"   | "end"    | "P: foo;;P: barbaz" |
    | "oo"      | "after"   | "end"    | "P: foo;;P: barbaz" |
    | "foo"     | "auto"    | "start"  | "P: bazbar"   |
    | "f"       | "auto"    | "start"  | "P: bazbaroo" |
    | "oo"      | "auto"    | "start"  | "P: fbazbar"  |
    | "foo"     | "auto"    | "end"    | "P: barbaz"   |
    | "f"       | "auto"    | "end"    | "P: barbazoo" |
    | "oo"      | "auto"    | "end"    | "P: fbarbaz"  |

Scenario Outline: Inserting text block on cross-block text selection
  Given the text "P: foo"
  When the editor is focused
  And "{Enter}" is pressed
  And "bar" is typed
  And <selection> is selected
  And "baz" is inserted at <placement> and selected at the <position>
  And "new" is typed
  Then the text is <text>

  Examples:
    | selection | placement | position | text                    |
    | "foob"    | "before"  | "start"  | "P: newbaz;;P: foo;;P: bar" |
    | "obar"    | "before"  | "start"  | "P: newbaz;;P: foo;;P: bar" |
    | "foob"    | "before"  | "end"    | "P: baznew;;P: foo;;P: bar" |
    | "obar"    | "before"  | "end"    | "P: baznew;;P: foo;;P: bar" |
    | "foob"    | "before"  | "none"   | "P: baz;;P: newar"      |
    | "obar"    | "before"  | "none"   | "P: baz;;P: fonew"      |
    | "foob"    | "after"   | "start"  | "P: foo;;P: bar;;P: newbaz" |
    | "obar"    | "after"   | "start"  | "P: foo;;P: bar;;P: newbaz" |
    | "foob"    | "after"   | "end"    | "P: foo;;P: bar;;P: baznew" |
    | "obar"    | "after"   | "end"    | "P: foo;;P: bar;;P: baznew" |
    | "foob"    | "after"   | "none"   | "P: newar;;P: baz"      |
    # Fails on Firefox
    # | "obar"    | "after"   | "none"   | "fonew\|baz"            |
    | "foob"    | "auto"    | "start"  | "P: newbazar"           |
    | "obar"    | "auto"    | "start"  | "P: fonewbaz"           |
    | "foob"    | "auto"    | "end"    | "P: baznewar"           |
    | "obar"    | "auto"    | "end"    | "P: fobaznew"           |
    | "foob"    | "auto"    | "none"   | "P: newbazar"           |
    | "obar"    | "auto"    | "none"   | "P: fonewbaz"           |

Scenario Outline: Inserting inline object on block object
  When "{image}" is inserted at "auto"
  And ",{stock-ticker}," is inserted at <placement>
  Then the text is <text>

  Examples:
    | placement | text                          |
    | "before"  | "P: {stock-ticker};;{IMAGE}"  |
    | "after"   | "{IMAGE};;P: {stock-ticker}"  |
    | "auto"    | "{IMAGE};;P: {stock-ticker}"  |

Scenario Outline: Inserting block object on inline object
  When ",{stock-ticker}," is inserted at "auto"
  And "{image}" is inserted at <placement>
  Then the text is <text>

  Examples:
    | placement | text                          |
    | "before"  | "{IMAGE};;P: {stock-ticker}"  |
    | "after"   | "P: {stock-ticker};;{IMAGE}"  |
    | "auto"    | "P: {stock-ticker};;{IMAGE}"  |

Scenario Outline: Inserting text block on inline object
  When ",{stock-ticker}," is inserted at "auto"
  And "foo" is inserted at <placement> and selected at the <select>
  Then the text is <text>

  Examples:
    | placement | select position | text                        |
    | "before"  | "end"           | "P: foo;;P: {stock-ticker}" |
    | "after"   | "start"         | "P: {stock-ticker};;P: foo" |
    | "auto"    | "start"         | "P: {stock-ticker}foo"      |