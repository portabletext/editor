# Simple marks like bold and italic
Feature: Decorators

  Background:
    Given one editor

  Scenario Outline: Inserting text at the edge of a decorator
    Given the text <text>
    When the editor is focused
    And <decorated> is selected
    And "strong" is toggled
    And the caret is put <position>
    And "new" is typed
    Then the text is <new text>

    Examples:
      | text              | decorated | position       | new text                          |
      | "P: foo bar baz"  | "bar"     | after "foo "   | "P: foo new[strong:bar] baz"      |
      | "P: foo bar baz"  | "bar"     | before "bar"   | "P: foo new[strong:bar] baz"      |
      | "P: foo bar baz"  | "bar"     | after "bar"    | "P: foo [strong:barnew] baz"      |
      | "P: foo bar baz"  | "bar"     | before " baz"  | "P: foo [strong:barnew] baz"      |
      | "P: foo"          | "foo"     | before "foo"   | "P: [strong:newfoo]"              |
      | "P: foo"          | "foo"     | after "foo"    | "P: [strong:foonew]"              |

  Scenario Outline: Toggling decorator at the edge of a decorator
    Given the text <text>
    And "em" around <decorated>
    When the editor is focused
    And the caret is put <position>
    And "strong" is toggled
    And "new" is typed
    Then the text is <new text>
    And "new" has marks <marks>

    Examples:
      | text              | decorated | position       | new text                                    | marks        |
      | "P: foo bar baz"  | "bar"     | after "foo "   | "P: foo [strong:new][em:bar] baz"           | "strong"     |
      | "P: foo bar baz"  | "bar"     | before "bar"   | "P: foo [strong:new][em:bar] baz"           | "strong"     |
      | "P: foo bar baz"  | "bar"     | after "bar"    | "P: foo [em:bar][em:[strong:new]] baz"      | "em,strong"  |
      | "P: foo bar baz"  | "bar"     | before " baz"  | "P: foo [em:bar][em:[strong:new]] baz"      | "em,strong"  |
      | "P: foo"          | "foo"     | before "foo"   | "P: [em:[strong:new]][em:foo]"              | "em,strong"  |
      | "P: foo"          | "foo"     | after "foo"    | "P: [em:foo][em:[strong:new]]"              | "em,strong"  |

  Scenario: Writing on top of a decorator
    Given the text "P: foo bar baz"
    When the editor is focused
    And "bar" is selected
    And "strong" is toggled
    And "removed" is typed
    Then the text is "P: foo [strong:removed] baz"
    And "removed" has marks "strong"

  Scenario: Toggling bold inside italic
    Given the text "P: foo bar baz"
    When "foo bar baz" is selected
    And "em" is toggled
    And "bar" is selected
    And "strong" is toggled
    Then the text is "P: [em:foo ][em:[strong:bar]][em: baz]"
    And "bar" has marks "em,strong"
    And "foo " has marks "em"
    And "bar" has marks "em,strong"
    And " baz" has marks "em"
    When "bar" is selected
    And "strong" is toggled
    Then the text is "P: [em:foo bar baz]"
    And "foo bar baz" has marks "em"

  Scenario: Toggling bold as you write
    Given the text "P:"
    When the editor is focused
    And the caret is put after ""
    And "foo" is typed
    And "strong" is toggled
    And "bar" is typed
    Then the text is "P: foo[strong:bar]"
    And "foo" has no marks
    And "bar" has marks "strong"

  Scenario: Toggling bold inside italic as you write
    Given the text "P:"
    When the editor is focused
    And the caret is put after ""
    And "em" is toggled
    And "foo " is typed
    And "strong" is toggled
    And "bar" is typed
    And "strong" is toggled
    And " baz" is typed
    Then the text is "P: [em:foo ][em:[strong:bar]][em: baz]"
    Then "foo " has marks "em"
    And "bar" has marks "em,strong"
    And " baz" has marks "em"

  Scenario: Toggling decorator mid-text and navigating left to clear it
    Given the text "P: foo"
    When the editor is focused
    And "strong" is toggled
    And "{ArrowLeft}" is pressed
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then the text is "P: foobar"
    And "foobar" has no marks

  Scenario: Deleting marked text and writing again, marked
    Given the text "P:"
    When the editor is focused
    And the caret is put after ""
    And "strong" is toggled
    And "foo" is typed
    And "{Backspace}" is pressed 3 times
    And "bar" is typed
    Then "bar" has marks "strong"

  Scenario Outline: Deleting expanded selection ending in a decorator
    Given the text <text>
    When the editor is focused
    And "bar" is selected
    And "strong" is toggled
    And "foobar" is selected <direction>
    And <button> is pressed
    Then the text is "P:"
    And the caret is before ""
    And "" has no marks

    Examples:
      | text                          | direction    | button        |
      | "P: foo;;P: bar"              | "forwards"   | "{Backspace}" |
      | "P: foo;;P: bar"              | "forwards"   | "{Delete}"    |
      | "P: foo;;P: bar"              | "backwards"  | "{Backspace}" |
      | "P: foo;;P: bar"              | "backwards"  | "{Delete}"    |
      | "P: foo;;{IMAGE};;P: bar"     | "forwards"   | "{Backspace}" |
      | "P: foo;;{IMAGE};;P: bar"     | "forwards"   | "{Delete}"    |
      | "P: foo;;{IMAGE};;P: bar"     | "backwards"  | "{Backspace}" |
      | "P: foo;;{IMAGE};;P: bar"     | "backwards"  | "{Delete}"    |

  Scenario Outline: Deleting expanded selection starting in a decorator
    Given the text <text>
    When the editor is focused
    And "foo" is selected
    And "strong" is toggled
    And "foobar" is selected <direction>
    And <button> is pressed
    Then the text is "P: [strong:]"
    And the caret is before ""
    And "" has marks "strong"

    Examples:
      | text                          | direction    | button        |
      | "P: foo;;P: bar"              | "forwards"   | "{Backspace}" |
      | "P: foo;;P: bar"              | "forwards"   | "{Delete}"    |
      | "P: foo;;P: bar"              | "backwards"  | "{Backspace}" |
      | "P: foo;;P: bar"              | "backwards"  | "{Delete}"    |
      | "P: foo;;{IMAGE};;P: bar"     | "forwards"   | "{Backspace}" |
      | "P: foo;;{IMAGE};;P: bar"     | "forwards"   | "{Delete}"    |
      | "P: foo;;{IMAGE};;P: bar"     | "backwards"  | "{Backspace}" |
      | "P: foo;;{IMAGE};;P: bar"     | "backwards"  | "{Delete}"    |

  Scenario: Deleting expanded selection with decorator toggled on
    Given the text "P: foo;;P: bar"
    When the editor is focused
    And the caret is put after "bar"
    And "strong" is toggled
    And "foobar" is selected
    And "{Backspace}" is pressed
    And "baz" is typed
    Then the text is "P: baz"
    And "baz" has no marks

  Scenario: Adding bold across an empty block and typing in the same
    Given the text "P: foo"
    When the editor is focused
    And "{Enter}" is pressed 2 times
    And "bar" is typed
    And "foobar" is selected
    And "strong" is toggled
    And the caret is put after "foo"
    And "{ArrowRight}" is pressed
    And "bar" is typed
    Then "bar" has marks "strong"

  Scenario: Toggling bold across an empty block
    Given the text "P: foo"
    When the editor is focused
    And "{Enter}" is pressed 2 times
    And "bar" is typed
    Then the text is "P: foo;;P:;;P: bar"
    When "ooba" is selected
    And "strong" is toggled
    Then the text is "P: f[strong:oo];;P: [strong:];;P: [strong:ba]r"
    And "oo" has marks "strong"
    And "ba" has marks "strong"
    When "strong" is toggled
    Then the text is "P: foo;;P:;;P: bar"

  Scenario Outline: Toggling bold on a cross-selection with the first line empty
    Given the text "P:;;P: foo"
    When everything is <selection>
    And "strong" is toggled
    Then the text is "P: [strong:];;P: [strong:foo]"
    And "" has marks "strong"
    And "foo" has marks "strong"
    When "strong" is toggled
    Then the text is "P:;;P: foo"
    And "" has no marks
    And "foo" has no marks

    Examples:
      | selection          |
      | selected           |
      | selected backwards |

  Scenario Outline: Toggling bold on a cross-selection with the last line empty
    Given the text "P: foo;;P:"
    When everything is <selection>
    And "strong" is toggled
    Then the text is "P: [strong:foo];;P: [strong:]"
    And "foo" has marks "strong"
    And "" has marks "strong"
    When "strong" is toggled
    Then the text is "P: foo;;P:"
    And "foo" has no marks
    And "" has no marks

    Examples:
      | selection          |
      | selected           |
      | selected backwards |

  Scenario: Splitting block before decorator
    Given the text "P: foo"
    And "strong" around "foo"
    When the editor is focused
    And the caret is put before "foo"
    And "{Enter}" is pressed
    And "{ArrowUp}" is pressed
    And "bar" is inserted
    Then the text is "P: [strong:bar];;P: [strong:foo]"
    And "bar" has marks "strong"
    And "foo" has marks "strong"

  Scenario Outline: Splitting block at the edge of decorator
    Given the text "P: foo bar baz"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put <position>
    And "{Enter}" is pressed
    Then the text is <new text>
    And the caret is <new position>

    Examples:
      | position       | new text                              | new position    |
      | after "foo "   | "P: foo ;;P: [strong:bar] baz"        | before "bar"    |
      | before "bar"   | "P: foo ;;P: [strong:bar] baz"        | before "bar"    |
      | after "bar"    | "P: foo [strong:bar];;P:  baz"        | before " baz"   |
      | before " baz"  | "P: foo [strong:bar];;P:  baz"        | before " baz"   |

  Scenario: Toggling decorators in empty block
    Given the text "P:"
    When the editor is focused
    And "foo" is typed
    And "{Backspace}" is pressed 3 times
    And "strong" is toggled
    Then the text is "P: [strong:]"
    And "" has marks "strong"

  Scenario: Splitting empty decorated block
    Given the text "P:"
    When the editor is focused
    And the caret is put after ""
    And "strong" is toggled
    And "{Enter}" is pressed
    And "foo" is typed
    Then the text is "P: [strong:];;P: foo"
    And "" has marks "strong"
    And "foo" has no marks

  Scenario: Merging spans with same but different-ordered decorators
    Given the text "P: foobar"
    And "strong" around "foo"
    And "em" around "bar"
    Then the text is "P: [strong:foo][em:bar]"
    And "foo" has marks "strong"
    And "bar" has marks "em"
    When "foo" is selected
    And "em" is toggled
    And "bar" is selected
    And "strong" is toggled
    Then the text is "P: [strong:[em:foobar]]"
    And "foobar" has marks "strong,em"

  Scenario: Toggling decorator with leading block object and trailing empty text
    Given the text "{IMAGE};;P: foo;;P:"
    When everything is selected
    And "strong" is toggled
    Then "foo" has marks "strong"
    And "" has marks "strong"
    When "strong" is toggled
    Then "foo" has no marks
    And "" has no marks
