Feature: Edge Cases

  Background:
    Given the editor is focused
    And a global keymap

  Scenario Outline: Longer Transform
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text       | inserted text | new text            |
      | ""         | "."           | "...new"            |
      | "foo"      | "."           | "foo...new"         |
      | ""         | "foo."        | "foo...new"         |
      | "foo."     | "."           | "foo....new"        |
      | ""         | "foo.bar."    | "foo...bar...new"   |
      | "foo.bar." | "baz."        | "foo.bar.baz...new" |

  Scenario Outline: End String Rule
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text         | inserted text | new text            |
      | "-"          | ">"           | "→new"              |
      | ""           | "->"          | "→new"              |
      | "foo"        | "->"          | "foo→new"           |
      | ""           | "foo->"       | "foo→new"           |
      | "foo-"       | ">bar"        | "foo->barnew"       |
      | ""           | "foo->bar->"  | "foo->bar→new"      |
      | "foo->bar->" | "baz->"       | "foo->bar->baz→new" |

  Scenario Outline: Non-Global Rule
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text           | inserted text  | new text              |
      | "(c"           | ")"            | "©new"                |
      | ""             | "(c)"          | "©new"                |
      | "foo"          | "(c)"          | "foo©new"             |
      | ""             | "foo(c)"       | "foo©new"             |
      | "foo(c"        | ")bar"         | "foo©barnew"          |
      | ""             | "foo(c)bar(c)" | "foo©bar©new"         |
      | "foo(c)bar(c)" | "baz(c)"       | "foo(c)bar(c)baz©new" |

  Scenario Outline: Writing after Multiple Groups Rule
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text    | inserted text | new text       |
      | ""      | "xfooy"       | "zfooznew"     |
      | "xfoo"  | "y"           | "zfooznew"     |
      | "xfooy" | "z"           | "xfooyznew"    |
      | ""      | "xfyxoy"      | "zfzzoznew"    |
      | ""      | "xfyxoyxoy"   | "zfzzozzoznew" |

  Scenario Outline: Replacing 'a' and 'c'
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text | inserted text | new text |
      | ""   | "ABC"         | "CBAnew" |
      | "AB" | "C"           | "CBAnew" |

  Scenario Outline: Undoing Multiple Groups Rule
    Given the text <text>
    When <inserted text> is inserted
    Then the text is <before undo>
    When undo is performed
    Then the text is <after undo>

    Examples:
      | text    | inserted text | before undo | after undo  |
      | ""      | "xfooy"       | "zfooz"     | "xfooy"     |
      | "xfoo"  | "y"           | "zfooz"     | "xfooy"     |
      | "xfooy" | "z"           | "xfooyz"    | "xfooy"     |
      | ""      | "xfyxoy"      | "zfzzoz"    | "xfyxoy"    |
      | ""      | "xfyxoyxoy"   | "zfzzozzoz" | "xfyxoyxoy" |

  Scenario Outline: Preserving inline objects
    Given the text <text>
    When <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text                                | inserted text | new text                                |
      | "(,{stock-ticker},c"                | ")"           | "(,{stock-ticker},c)new"                |
      | "-,{stock-ticker},"                 | ">"           | "-,{stock-ticker},>new"                 |
      | ",{stock-ticker},-,{stock-ticker}," | ">"           | ",{stock-ticker},-,{stock-ticker},>new" |
      | ",{stock-ticker},-"                 | ">"           | ",{stock-ticker},→new"                  |

  Scenario: Preserving adjoining inline object and placing caret correctly
    Given the text "(c,{stock-ticker},"
    When the caret is put after "c"
    And ")new" is typed
    Then the text is "©new,{stock-ticker},"

  Scenario: Preserving adjoining inline object and placing caret correctly
    Given the text "#,{stock-ticker},"
    When the caret is put after "#"
    And " new" is typed
    Then the text is "new,{stock-ticker},"

  Scenario Outline: H1 rule
    Given the text <text>
    When the caret is put <position>
    And <key> is pressed
    And "# " is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text                  | position    | key           | new text                   |
      # Pressing Shift is a noop. It only exists so we can press Backspace in
      # subsequent Scenarios to position to caret at the edge of the inline
      # object.
      | ""                    | after ""    | "{Shift}"     | "new"                      |
      | "foo"                 | after "foo" | "{Shift}"     | "foo# new"                 |
      | ",{stock-ticker},foo" | after "foo" | "{Shift}"     | ",{stock-ticker},foo# new" |
      # This is an edge case we have to live with. There's no way of knowing
      # that the inline object before the caret should prevent the rule from
      # running.
      | ",{stock-ticker},f"   | after "f"   | "{Backspace}" | "new,{stock-ticker},"      |
      | "f,{stock-ticker},"   | after "f"   | "{Backspace}" | "new,{stock-ticker},"      |

  Scenario Outline: Better H2 rule
    Given the text <text>
    When the caret is put <position>
    And <key> is pressed
    And "## " is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text                  | position    | key           | new text                    |
      # Pressing Shift is a noop. It only exists so we can press Backspace in
      # subsequent Scenarios to position to caret at the edge of the inline
      # object.
      | ""                    | after ""    | "{Shift}"     | "new"                       |
      | "foo"                 | after "foo" | "{Shift}"     | "foo## new"                 |
      | ",{stock-ticker},foo" | after "foo" | "{Shift}"     | ",{stock-ticker},foo## new" |
      | ",{stock-ticker},f"   | after "f"   | "{Backspace}" | ",{stock-ticker},## new"    |
      | "f,{stock-ticker},"   | after "f"   | "{Backspace}" | "new,{stock-ticker},"       |

  Scenario Outline: Unmatched Groups Rule
    Given the text <text>
    When the caret is put <position>
    And <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text | position | inserted text | new text    |
      | ""   | after "" | "---"         | "<hr />new" |

  Scenario Outline: Expanded selection
    Given the text <text>
    When <selection> is selected
    And <inserted text> is inserted
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text        | selection | inserted text | new text  |
      | "(foo"      | "foo"     | "c)"          | "©new"    |
      | "(foo"      | "oo"      | "c)"          | "(fc)new" |
      | "(foo"      | "(foo"    | "c)"          | "c)new"   |
      | "(coo\|bar" | "ooba"    | ")"           | "©newr"   |

  Scenario Outline: Undo after transform on expanded selection
    Given the text <text>
    When <selection> is selected
    And <inserted text> is inserted
    Then the text is <before undo>
    When undo is performed
    Then the text is <after undo>

    Examples:
      | text  | selection | inserted text | before undo | after undo |
      | "(cf" | "f"       | ")"           | "©"         | "(c)"      |

  Scenario: Consecutive undo after selection change
    Given the text ""
    When "->" is typed
    And undo is performed
    And "{ArrowLeft}" is pressed
    And undo is performed
    Then the text is "-"

  Scenario Outline: Multiple overlapping matches in one insertion
    Given the text ""
    When "1*2*3" is inserted
    Then the text is "1×2×3"
