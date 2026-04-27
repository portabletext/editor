Feature: Edge Cases

  Background:
    Given a global keymap

  Scenario Outline: Longer Transform
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state         | inserted text | new state                |
      | "B: "         | "."           | "B: ...new\|"            |
      | "B: foo"      | "."           | "B: foo...new\|"         |
      | "B: "         | "foo."        | "B: foo...new\|"         |
      | "B: foo."     | "."           | "B: foo....new\|"        |
      | "B: "         | "foo.bar."    | "B: foo...bar...new\|"   |
      | "B: foo.bar." | "baz."        | "B: foo.bar.baz...new\|" |

  Scenario Outline: End String Rule
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state           | inserted text | new state                |
      | "B: -\|"        | ">"           | "B: →new\|"              |
      | "B: "           | "->"          | "B: →new\|"              |
      | "B: foo"        | "->"          | "B: foo→new\|"           |
      | "B: "           | "foo->"       | "B: foo→new\|"           |
      | "B: foo-"       | ">bar"        | "B: foo->barnew\|"       |
      | "B: "           | "foo->bar->"  | "B: foo->bar→new\|"      |
      | "B: foo->bar->" | "baz->"       | "B: foo->bar->baz→new\|" |

  Scenario Outline: Non-Global Rule
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state             | inserted text  | new state                  |
      | "B: (c"           | ")"            | "B: ©new\|"                |
      | "B: "             | "(c)"          | "B: ©new\|"                |
      | "B: foo"          | "(c)"          | "B: foo©new\|"             |
      | "B: "             | "foo(c)"       | "B: foo©new\|"             |
      | "B: foo(c"        | ")bar"         | "B: foo©barnew\|"          |
      | "B: "             | "foo(c)bar(c)" | "B: foo©bar©new\|"         |
      | "B: foo(c)bar(c)" | "baz(c)"       | "B: foo(c)bar(c)baz©new\|" |

  Scenario Outline: Writing after Multiple Groups Rule
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state      | inserted text | new state           |
      | "B: "      | "xfooy"       | "B: zfooznew\|"     |
      | "B: xfoo"  | "y"           | "B: zfooznew\|"     |
      | "B: xfooy" | "z"           | "B: xfooyznew\|"    |
      | "B: "      | "xfyxoy"      | "B: zfzzoznew\|"    |
      | "B: "      | "xfyxoyxoy"   | "B: zfzzozzoznew\|" |

  Scenario Outline: Replacing 'a' and 'c'
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state   | inserted text | new state     |
      | "B: "   | "ABC"         | "B: CBAnew\|" |
      | "B: AB" | "C"           | "B: CBAnew\|" |

  Scenario Outline: Undoing Multiple Groups Rule
    Given the editor state is <state>
    When the editor is focused
    And <inserted text> is inserted
    Then the editor state is <before undo>
    When undo is performed
    Then the editor state is <after undo>

    Examples:
      | state      | inserted text | before undo      | after undo     |
      | "B: "      | "xfooy"       | "B: zfooz\|"     | "B: xfooy"     |
      | "B: xfoo"  | "y"           | "B: zfooz\|"     | "B: xfooy"     |
      | "B: xfooy" | "z"           | "B: xfooyz\|"    | "B: xfooy"     |
      | "B: "      | "xfyxoy"      | "B: zfzzoz\|"    | "B: xfyxoy"    |
      | "B: "      | "xfyxoyxoy"   | "B: zfzzozzoz\|" | "B: xfyxoyxoy" |

  Scenario Outline: Preserving inline objects
    When the editor is focused
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
    Given the editor state is "B: (c{stock-ticker}"
    When the editor is focused
    And the caret is put after "c"
    And ")new" is typed
    Then the editor state is "B: ©new|{stock-ticker}"

  Scenario: Preserving adjoining inline object and placing caret correctly
    Given the editor state is "B: #{stock-ticker}"
    When the editor is focused
    And the caret is put after "#"
    And " new" is typed
    Then the editor state is "B: new|{stock-ticker}"

  Scenario Outline: H1 rule
    Given the editor state is <state>
    When the editor is focused
    And the caret is put <position>
    And <key> is pressed
    And "# " is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state                  | position    | key           | new state                     |
      # Pressing Shift is a noop. It only exists so we can press Backspace in
      # subsequent Scenarios to position to caret at the edge of the inline
      # object.
      | "B: "                  | after ""    | "{Shift}"     | "B: new\|"                    |
      | "B: foo"               | after "foo" | "{Shift}"     | "B: foo# new\|"               |
      | "B: {stock-ticker}foo" | after "foo" | "{Shift}"     | "B: {stock-ticker}foo# new\|" |
      # This is an edge case we have to live with. There's no way of knowing
      # that the inline object before the caret should prevent the rule from
      # running.
      | "B: {stock-ticker}f"   | after "f"   | "{Backspace}" | "B: new\|{stock-ticker}"      |
      | "B: f{stock-ticker}"   | after "f"   | "{Backspace}" | "B: new\|{stock-ticker}"      |

  Scenario Outline: Better H2 rule
    Given the editor state is <state>
    When the editor is focused
    And the caret is put <position>
    And <key> is pressed
    And "## " is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state                  | position    | key           | new state                      |
      # Pressing Shift is a noop. It only exists so we can press Backspace in
      # subsequent Scenarios to position to caret at the edge of the inline
      # object.
      | "B: "                  | after ""    | "{Shift}"     | "B: new\|"                     |
      | "B: foo"               | after "foo" | "{Shift}"     | "B: foo## new\|"               |
      | "B: {stock-ticker}foo" | after "foo" | "{Shift}"     | "B: {stock-ticker}foo## new\|" |
      | "B: {stock-ticker}f"   | after "f"   | "{Backspace}" | "B: {stock-ticker}## new\|"    |
      | "B: f{stock-ticker}"   | after "f"   | "{Backspace}" | "B: new\|{stock-ticker}"       |

  Scenario Outline: Unmatched Groups Rule
    Given the editor state is <state>
    When the editor is focused
    And the caret is put <position>
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state | position | inserted text | new state        |
      | "B: " | after "" | "---"         | "B: <hr />new\|" |

  Scenario Outline: Expanded selection
    Given the editor state is <state>
    When the editor is focused
    And <selection> is selected
    And <inserted text> is inserted
    And "new" is typed
    Then the editor state is <new state>

    Examples:
      | state             | selection | inserted text | new state      |
      | "B: (foo"         | "foo"     | "c)"          | "B: ©new\|"    |
      | "B: (foo"         | "oo"      | "c)"          | "B: (fc)new\|" |
      | "B: (foo"         | "(foo"    | "c)"          | "B: c)new\|"   |
      | "B: (coo;;B: bar" | "ooba"    | ")"           | "B: ©new\|r"   |

  Scenario Outline: Undo after transform on expanded selection
    Given the editor state is <state>
    When the editor is focused
    And <selection> is selected
    And <inserted text> is inserted
    Then the editor state is <before undo>
    When undo is performed
    Then the editor state is <after undo>

    Examples:
      | state    | selection | inserted text | before undo | after undo |
      | "B: (cf" | "f"       | ")"           | "B: ©\|"    | "B: (c)"   |

  Scenario: Consecutive undo after selection change
    Given the editor state is "B: "
    When "->" is typed
    And undo is performed
    And "{ArrowLeft}" is pressed
    And undo is performed
    Then the editor state is "B: -|"

  Scenario Outline: Multiple overlapping matches in one insertion
    Given the editor state is "B: "
    When "1*2*3" is inserted
    Then the editor state is "B: 1×2×3|"

  Scenario: Backspace after typing following input rule should delete character
    Given the editor state is "B: "
    When "->" is typed
    Then the editor state is "B: →|"
    When "foo" is typed
    Then the editor state is "B: →foo"
    When "{Backspace}" is pressed
    Then the editor state is "B: →fo"
