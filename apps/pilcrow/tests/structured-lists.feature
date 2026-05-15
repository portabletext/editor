Feature: Structured Lists Plugin
  A plugin that represents lists as containers (a `list` block-object whose
  `items` field holds `list-item` objects whose `content` field holds text
  blocks and nested lists), preserving the user-facing keyboard semantics of
  the core flat-list behaviors.

  The same primitives drive the keyboard shortcuts:
  Tab        sinks the focus list-item one level deeper
  Shift+Tab  lifts the focus list-item one level out

  Scenario: Pressing Tab sinks a list-item into the preceding sibling
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: first
        LIST-ITEM:
          B: second
      """
    When the editor is focused
    And the caret is put before "second"
    And "{Tab}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: first
          LIST:
            LIST-ITEM:
              B: |second
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: first
        LIST-ITEM:
          B: |second
      """

  Scenario: Pressing Tab on the first list-item wraps it in an empty parent list-item
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: only
      """
    When the editor is focused
    And the caret is put before "only"
    And "{Tab}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          LIST:
            LIST-ITEM:
              B: |only
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: |only
      """

  Scenario: Pressing Tab merges into a trailing list (kind-agnostic)
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: first
          LIST:
            LIST-ITEM:
              B: first.a
        LIST-ITEM:
          B: second
      """
    When the editor is focused
    And the caret is put before "second"
    And "{Tab}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: first
          LIST:
            LIST-ITEM:
              B: first.a
            LIST-ITEM:
              B: |second
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: first
          LIST:
            LIST-ITEM:
              B: first.a
        LIST-ITEM:
          B: |second
      """

  Scenario: Pressing Shift+Tab lifts a nested list-item to be a sibling of its enclosing list-item
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: outer
          LIST:
            LIST-ITEM:
              B: inner
      """
    When the editor is focused
    And the caret is put before "inner"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: outer
        LIST-ITEM:
          B: |inner
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: outer
          LIST:
            LIST-ITEM:
              B: |inner
      """

  Scenario: Pressing Shift+Tab from a middle nested item leaves leading siblings, carries trailing siblings as nested children
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
          LIST:
            LIST-ITEM:
              B: a
            LIST-ITEM:
              B: middle
            LIST-ITEM:
              B: c
      """
    When the editor is focused
    And the caret is put before "middle"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
          LIST:
            LIST-ITEM:
              B: a
        LIST-ITEM:
          B: |middle
          LIST:
            LIST-ITEM:
              B: c
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
          LIST:
            LIST-ITEM:
              B: a
            LIST-ITEM:
              B: |middle
            LIST-ITEM:
              B: c
      """

  Scenario: Pressing Shift+Tab on the only item under an empty wrapper list-item removes the wrapper too
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          LIST:
            LIST-ITEM:
              B: only
      """
    When the editor is focused
    And the caret is put before "only"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: |only
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          LIST:
            LIST-ITEM:
              B: |only
      """

  Scenario: Pressing Shift+Tab on the first nested item removes the (now-empty) original nested list
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
          LIST:
            LIST-ITEM:
              B: only-nested
      """
    When the editor is focused
    And the caret is put before "only-nested"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
        LIST-ITEM:
          B: |only-nested
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
          LIST:
            LIST-ITEM:
              B: |only-nested
      """

  Scenario: Pressing Shift+Tab at the outermost list is a no-op
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: alpha
        LIST-ITEM:
          B: beta
      """
    When the editor is focused
    And the caret is put before "alpha"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: |alpha
        LIST-ITEM:
          B: beta
      """

  Scenario: Sinking a list-item preserves an image in the preceding sibling
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: caption
          {IMAGE src="cat.png"}
        LIST-ITEM:
          B: next
      """
    When the editor is focused
    And the caret is put before "next"
    And "{Tab}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: caption
          {IMAGE src="cat.png"}
          LIST:
            LIST-ITEM:
              B: |next
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: caption
          {IMAGE src="cat.png"}
        LIST-ITEM:
          B: |next
      """

  Scenario: Lifting a list-item carries the rest of its content (text + image) along
    Given the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
          LIST:
            LIST-ITEM:
              B: mixed
              {IMAGE src="graph.png"}
      """
    When the editor is focused
    And the caret is put before "mixed"
    And "{Shift>}{Tab}{/Shift}" is pressed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
        LIST-ITEM:
          B: |mixed
          {IMAGE src="graph.png"}
      """
    When undo is performed
    Then the editor state is
      """
      LIST:
        LIST-ITEM:
          B: parent
          LIST:
            LIST-ITEM:
              B: |mixed
              {IMAGE src="graph.png"}
      """
