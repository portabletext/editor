Feature: Lists

Background:
  Given one editor

Scenario: Clearing list item on Enter
  Given the text "OL:{LI: foo;;LI:}"
  When the editor is focused
  And the caret is put after ""
  And "{Enter}" is pressed
  And "bar" is typed
  Then the text is "OL:{LI: foo};;P: bar"

Scenario: Indenting list item on Tab
  Given the text "OL:{LI: foo;;LI:}"
  When the editor is focused
  And the caret is put after ""
  And "{Tab}" is pressed
  And "bar" is typed
  Then the text is "OL:{LI:{P: foo;;OL:{LI: bar}}}"

Scenario: Unindenting list item on Shift+Tab
  Given the text "OL:{LI:{P: foo;;OL:{LI: bar}}}"
  When the editor is focused
  And the caret is put before "bar"
  And "{Shift>}{Tab}{/Shift}" is pressed
  Then the text is "OL:{LI: foo;;LI: bar}"

Scenario: Pressing Delete in an empty list item
  Given the text "OL:{LI: f};;H1: bar"
  When the editor is focused
  And the caret is put before "f"
  And "{Delete}" is pressed 2 times
  Then the text is "OL:{LI:{H1: bar}}"

Scenario: Pressing Backspace in an empty list item
  Given the text "OL:{LI:}"
  When the editor is focused
  And the caret is put after ""
  And "{Backspace}" is pressed
  Then the text is "P:"

Scenario: Pressing Backspace in an empty list item after a block object
  Given the text "{IMAGE};;OL:{LI:}"
  When the editor is focused
  And the caret is put after ""
  And "{Backspace}" is pressed
  Then the text is "{IMAGE};;P:"

Scenario Outline: Pressing Backspace after an empty list item
  When the editor is focused
  Given the text <text>
  When the caret is put <caret>
  And "{Backspace}" is pressed
  Then the text is <new>

  Examples:
    | text                      | caret position | new text                  |
    | "OL:{LI:};;H1: foo" | before "foo" | "OL:{LI:{H1: foo}}" |
    | "OL:{LI: foo;;LI:;;LI: bar}" | after "bar" | "OL:{LI: foo;;LI:;;LI: ba}" |

Scenario: Inserting indented numbered list in empty text block
  Given the text "P:"
  When "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}" is inserted at "auto"
  Then the text is "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}"

Scenario Outline: Inserting list on list item
  Given the text <text>
  When the caret is put <position>
  And <blocks> is inserted at "auto"
  Then the text is <new>

  Examples:
    | text     | position    | blocks                                | new text                              |
    | "OL:{LI:}" | after "" | "OL:{LI: foo;;LI: bar;;LI: baz}" | "OL:{LI: foo;;LI: bar;;LI: baz}" |
    | "OL:{LI:}" | after "" | "UL:{LI: foo;;LI: bar;;LI: baz}" | "UL:{LI: foo;;LI: bar;;LI: baz}" |
    | "OL:{LI: foo}" | after "foo" | "OL:{LI: foo;;LI: bar;;LI: baz}" | "OL:{LI: foofoo;;LI: bar;;LI: baz}" |
    | "OL:{LI: foo}" | after "foo" | "UL:{LI: foo;;LI: bar;;LI: baz}" | "OL:{LI: foofoo;;LI: bar;;LI: baz}" |
    | "OL:{LI: foo}" | after "foo" | "UL:{LI:{P: foo;;OL:{LI: bar}};;LI: baz}" | "OL:{LI:{P: foofoo;;OL:{LI: bar}};;LI: baz}" |
    | "OL:{LI: foo}" | after "foo" | "UL:{LI:{P: foo;;UL:{LI: bar}};;LI: baz}" | "OL:{LI:{P: foofoo;;UL:{LI: bar}};;LI: baz}" |

Scenario Outline: Inserting lower-level list on list item
  Given the text "OL:{LI:}"
  When the caret is put after ""
  And "OL:{LI: foo;;LI: bar;;LI: baz}" is inserted at "auto"
  Then the text is "OL:{LI: foo;;LI: bar;;LI: baz}"

Scenario: Inserting different lower-level list type on list item
  Given the text "OL:{LI:}"
  When the caret is put after ""
  And "UL:{LI: foo;;LI: bar;;LI: baz}" is inserted at "auto"
  Then the text is "UL:{LI: foo;;LI: bar;;LI: baz}"

Scenario: Inserting inverse-indented list on list item
  Given the text "OL:{LI:}"
  When the caret is put after ""
  And "UL:{LI:{P: bar;;UL:{LI: baz}}}" is inserted at "auto"
  Then the text is "UL:{LI:{P: bar;;UL:{LI: baz}}}"

Scenario: Inserting lower-level inverse-indented list on list item
  Given the text "OL:{LI:}"
  When the caret is put after ""
  And "UL:{LI:{P: bar;;UL:{LI: baz}}}" is inserted at "auto"
  Then the text is "UL:{LI:{P: bar;;UL:{LI: baz}}}"

Scenario: Inserting lower-level, indented list on list item
  Given the text "OL:{LI:}"
  When the caret is put after ""
  And "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}" is inserted at "auto"
  Then the text is "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}"

Scenario: Inserting list that will exceed the maximum level (10)
  Given the text "OL:{LI:}"
  When the caret is put after ""
  And "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}" is inserted at "auto"
  Then the text is "OL:{LI:{P: foo;;OL:{LI: bar;;LI: baz}}}"

Scenario: Inserting list that exceeds the maximum level (10)
  Given the text "OL:{LI:}"
  When the caret is put after ""
  And "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}" is inserted at "auto"
  Then the text is "OL:{LI:{P: foo;;OL:{LI: bar;;LI: baz}}}"

Scenario: Inserting mixed blocks starting with a list item
  Given the text "UL:{LI:}"
  When the caret is put after ""
  And "OL:{LI: foo};;{IMAGE};;OL:{LI: baz}" is inserted at "auto"
  Then the text is "OL:{LI: foo};;{IMAGE};;OL:{LI: baz}"

Scenario: Inserting mixed blocks not starting with a list item
  Given the text "UL:{LI:}"
  When the caret is put after ""
  And "P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}" is inserted at "auto"
  Then the text is "OL:{LI: foo;;LI:{P: bar;;OL:{LI: baz}}}"

Scenario: Inserting mixed blocks not starting with list items
  Given the text "UL:{LI:}"
  When the caret is put after ""
  And "P: foo;;P: bar;;OL:{LI: baz}" is inserted at "auto"
  Then the text is "UL:{LI: foo};;P: bar;;OL:{LI: baz}"

Scenario Outline: Inserting two lists preceded by a paragraph
  Given the text <text>
  When the caret is put after ""
  And <blocks> is inserted at "auto"
  Then the text is <new>

  Examples:
    | text    | blocks                                              | new text                                            |
    | "UL:{LI:}" | "P: foo;;UL:{LI:{P: bar;;UL:{LI: baz}}};;P: fizz;;UL:{LI: buzz}" | "UL:{LI: foo;;LI:{P: bar;;UL:{LI: baz}}};;P: fizz;;UL:{LI: buzz}" |
    | "UL:{LI:}" | "P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}};;P: fizz;;OL:{LI: buzz}" | "OL:{LI: foo;;LI:{P: bar;;OL:{LI: baz}}};;P: fizz;;OL:{LI: buzz}" |
    | "OL:{LI:}" | "P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}};;P: fizz;;OL:{LI: buzz}" | "OL:{LI: foo;;LI:{P: bar;;OL:{LI: baz}}};;P: fizz;;OL:{LI: buzz}" |
    | "OL:{LI:}" | "P: foo;;UL:{LI:{P: bar;;UL:{LI: baz}}};;P: fizz;;UL:{LI: buzz}" | "UL:{LI: foo;;LI:{P: bar;;UL:{LI: baz}}};;P: fizz;;UL:{LI: buzz}" |

Scenario: Inserting heading on empty list item
  Given the text "UL:{LI:}"
  When the caret is put after ""
  And "H1: foo" is inserted at "auto"
  Then the text is "UL:{LI:{H1: foo}}"

Scenario: Inserting heading on non-empty list item
  Given the text "UL:{LI: foo}"
  When the caret is put before "foo"
  And "H1: bar" is inserted at "auto"
  Then the text is "UL:{LI: barfoo}"

Scenario: Inserting image on empty list item
  Given the text "UL:{LI:}"
  When the caret is put after ""
  And "{IMAGE}" is inserted at "auto"
  Then the text is "{IMAGE}"

Scenario Outline: Deleting list
  Given the text <text>
  When the editor is focused
  And <selection> is selected
  And "{Backspace}" is pressed
  Then the text is <new>

  Examples:
    | text                            | selection    | new text |
    | "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}" | "foobarbaz" | "OL:{LI:}" |
    | "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}" | "oobarbaz" | "OL:{LI: f}" |
    | "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}" | "oobarba" | "OL:{LI: fz}" |
    | "OL:{LI:{P: foo;;OL:{LI:{P: bar;;OL:{LI: baz}}}}}" | "foobarba" | "OL:{LI: z}" |

Scenario: Undo after deleting list
  Given the text "OL:{LI:{P: foo;;OL:{LI: bar}}}"
  When the editor is focused
  And "fooba" is selected
  And "{Backspace}" is pressed
  Then the text is "OL:{LI: r}"
  When undo is performed
  Then the text is "OL:{LI:{P: foo;;OL:{LI: bar}}}"