Feature: Right-to-Left Text Editing

  Scenario: ArrowLeft in RTL editor moves visually left (toward end)
    Given one RTL editor
    And the text "שלום"
    When the editor is focused
    And the caret is put after "של"
    And "{ArrowLeft}" is pressed
    Then the caret is after "שלו"

  Scenario: ArrowRight in LTR text in RTL editor moves toward end
    Given one RTL editor
    And the text "abc"
    When the editor is focused
    And the caret is put after "a"
    And "{ArrowRight}{ArrowRight}" is pressed
    And "d" is typed
    Then the text is "abcd"
    And the caret is after "d"

  Scenario: ArrowRight in RTL editor moves visually right (toward start)
    Given one RTL editor
    And the text "שלום"
    When the editor is focused
    And the caret is put after "של"
    And "{ArrowRight}" is pressed
    Then the caret is after "ש"

  @skip-firefox
  Scenario: Selection in RTL editor with Shift+ArrowLeft
    Given one RTL editor
    And the text "שלום"
    When the editor is focused
    And the caret is put after "של"
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    And "{Shift>}{ArrowLeft}{/Shift}" is pressed
    Then "ום" is selected

  Scenario: Backspace in RTL editor
    Given one RTL editor
    And the text "שלום"
    When the caret is put after "שלום"
    And "{Backspace}" is pressed
    Then the text is "שלו"

  Scenario: Delete key in RTL editor
    Given one RTL editor
    And the text "שלום"
    When the caret is put before "שלום"
    And "{Delete}" is pressed
    Then the text is "לום"

  Scenario: Typing Hebrew in RTL editor places caret at end
    Given one RTL editor
    And the text ""
    When the editor is focused
    And "שלום" is typed
    Then the text is "שלום"
    And the caret is after "שלום"

  Scenario: Typing in middle of Hebrew text in RTL editor
    Given one RTL editor
    And the text "אבגד"
    When the editor is focused
    And the caret is put after "אב"
    And "XY" is typed
    Then the text is "אבXYגד"
    And the caret is after "אבXY"

  Scenario: Type then navigate in RTL editor
    Given one RTL editor
    And the text ""
    When the editor is focused
    And "אבגד" is typed
    And "{ArrowRight}" is pressed
    Then the caret is after "אבג"
    When "X" is typed
    Then the text is "אבגXד"

  Scenario: Typing LTR text in RTL editor
    Given one RTL editor
    And the text ""
    When the editor is focused
    And "Hello World" is typed
    Then the text is "Hello World"
    And the caret is after "Hello World"

  Scenario: Mixing RTL and LTR typing in RTL editor
    Given one RTL editor
    And the text ""
    When the editor is focused
    And "שלום " is typed
    And "Hello" is typed
    And " עולם" is typed
    Then the text is "שלום Hello עולם"
    And the caret is after "שלום Hello עולם"

  # ===========================================
  # Visual Position Tests
  # These verify actual rendered positions on screen
  # ===========================================
  Scenario: Hebrew text renders with first character on the right
    Given one RTL editor
    When "אבג" is typed
    Then the text is "אבג"
    # In RTL: א (first typed) appears on right, ג (last typed) appears on left
    And "ג" is visually before "א"

  Scenario: English text renders left-to-right even in RTL editor
    Given one RTL editor
    When "abc" is typed
    Then the text is "abc"
    # English is always LTR: a (first) on left, c (last) on right
    And "a" is visually before "c"

  # ===========================================
  # LTR Editor with RTL Content
  # These tests run in a regular LTR editor containing RTL text
  # ===========================================
  Scenario: RTL text in LTR editor - ArrowLeft moves visually left
    Given one editor
    And the text "שלום"
    When the editor is focused
    And the caret is put after "של"
    And "{ArrowLeft}" is pressed
    Then the caret is after "שלו"

  Scenario: RTL text in LTR editor - ArrowRight moves visually right
    Given one editor
    And the text "שלום"
    When the editor is focused
    And the caret is put after "של"
    And "{ArrowRight}" is pressed
    Then the caret is after "ש"

  Scenario: Mixed bidi in LTR editor - navigation at boundary
    Given one editor
    And the text "Hello שלום"
    When the editor is focused
    And the caret is put after "Hello "
    And "{ArrowRight}" is pressed
    Then the caret is after "ש"

  Scenario: Mixed bidi in LTR editor - deletion across boundary
    Given one editor
    And the text "Hello שלום World"
    When the editor is focused
    And "שלום" is selected
    And "{Backspace}" is pressed
    Then the text is "Hello  World"

  # ===========================================
  # Edge Cases - Bidi Boundaries
  # These test potentially problematic RTL scenarios
  # ===========================================
  Scenario: Numbers in RTL text
    Given one RTL editor
    When "שלום 123 עולם" is typed
    Then the text is "שלום 123 עולם"
    # Numbers are rendered LTR even in RTL context
    And "1" is visually before "3"

  Scenario: Typing at bidi boundary - after LTR in mixed text
    Given one RTL editor
    When "Hello שלום" is typed
    And the caret is put after "Hello"
    And "X" is typed
    Then the text is "HelloX שלום"

  Scenario: Backspace at bidi boundary
    Given one RTL editor
    When "Hello שלום" is typed
    And the caret is put before "שלום"
    And "{Backspace}" is pressed
    Then the text is "Helloשלום"

  Scenario: Punctuation in RTL text
    Given one RTL editor
    When "שלום, עולם!" is typed
    Then the text is "שלום, עולם!"

  Scenario: Parentheses in RTL text
    Given one RTL editor
    When "שלום (hello) עולם" is typed
    Then the text is "שלום (hello) עולם"

  Scenario: Selecting across multiple bidi segments
    Given one RTL editor
    When "אבג Hello עולם" is typed
    And "בג Hello עו" is selected
    And "{Backspace}" is pressed
    Then the text is "אלם"

  Scenario: Backspace through entire mixed bidi text
    Given one RTL editor
    When "Hi שלום" is typed
    And "{Backspace}" is pressed 7 times
    Then the text is ""

  Scenario: Delete through entire mixed bidi text
    Given one RTL editor
    When "שלום Hi" is typed
    And the caret is put before "שלום Hi"
    And "{Delete}" is pressed 7 times
    Then the text is ""

  Scenario: Undo after typing in RTL editor
    Given one RTL editor
    When "שלום" is typed
    And undo is performed
    Then the text is ""

  Scenario: Bold across bidi boundary
    Given one RTL editor
    When "Hello שלום" is typed
    And "o של" is selected
    And "strong" is toggled
    Then the text is "Hell,o של,ום"
    And "o של" has marks "strong"

  # ===========================================
  # Multi-Block RTL Scenarios
  # ===========================================
  Scenario: Enter creates new block in RTL editor
    Given one RTL editor
    When "שלום" is typed
    And "{Enter}" is pressed
    And "עולם" is typed
    And the caret is put before "עולם"
    And "{Backspace}" is pressed
    # Blocks merge when backspace at start of second block
    Then the text is "שלוםעולם"

  Scenario: Delete at end of RTL block merges with next
    Given one RTL editor
    When "שלום" is typed
    And "{Enter}" is pressed
    And "עולם" is typed
    And the caret is put after "שלום"
    And "{Delete}" is pressed
    Then the text is "שלוםעולם"

  # ===========================================
  # Selection Edge Cases
  # ===========================================
  Scenario: Select all in RTL editor
    Given one RTL editor
    When "שלום עולם" is typed
    And "select.all" is pressed
    Then "שלום עולם" is selected

  Scenario: Delete selected RTL text
    Given one RTL editor
    When "שלום עולם" is typed
    And "שלום" is selected
    And "{Backspace}" is pressed
    Then the text is " עולם"

  Scenario: Select all and delete in RTL editor
    Given one RTL editor
    When "שלום עולם" is typed
    And "select.all" is pressed
    And "{Backspace}" is pressed
    Then the text is ""

  # ===========================================
  # RTL with Decorators
  # ===========================================
  Scenario: Bold RTL text
    Given one RTL editor
    When "לחץ כאן" is typed
    And "כאן" is selected
    And "strong" is toggled
    Then "כאן" has marks "strong"

  Scenario: Bold across bidi boundary in RTL editor
    Given one RTL editor
    When "Click כאן please" is typed
    And "ck כאן ple" is selected
    And "strong" is toggled
    Then "ck כאן ple" has marks "strong"

  Scenario: Italic RTL text
    Given one RTL editor
    When "שלום עולם" is typed
    And "עולם" is selected
    And "em" is toggled
    Then "עולם" has marks "em"
