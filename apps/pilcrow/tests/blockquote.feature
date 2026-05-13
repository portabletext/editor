Feature: Structured Blockquotes
  Blockquotes in Pilcrow are containers, not styles. A `blockquote`
  block-object holds a `content` array of text blocks (and nested
  blockquotes). Typing `> ` at the start of a paragraph converts the
  paragraph into a blockquote. Typing the GFM admonition marker
  `[!NOTE]` on the first line of a blockquote converts the whole
  quote into a callout.

  Scenario: Typing `> ` at the start of a paragraph wraps it in a blockquote
    Given the editor state is "B: |"
    When the editor is focused
    And "> " is typed
    Then the editor state is
      """
      BLOCKQUOTE:
        B: |
      """

  Scenario: Pre-existing blockquote in initial state renders
    Given the editor state is
      """
      BLOCKQUOTE:
        B: hello
      """
    When the editor is focused
    Then the editor state is
      """
      BLOCKQUOTE:
        B: hello
      """

  Scenario: Nested blockquote is preserved
    Given the editor state is
      """
      BLOCKQUOTE:
        B: outer
        BLOCKQUOTE:
          B: inner
      """
    When the editor is focused
    Then the editor state is
      """
      BLOCKQUOTE:
        B: outer
        BLOCKQUOTE:
          B: inner
      """

  Scenario: Typing `[!NOTE]` on the first line of a blockquote converts to callout
    Given the editor state is
      """
      BLOCKQUOTE:
        B: |
      """
    When the editor is focused
    And "{[}!NOTE{]}" is typed
    Then the editor state is
      """
      CALLOUT:
        B: |
      """

  Scenario: Typing `> ` mid-paragraph keeps it intact
    Given the editor state is "B: foo|"
    When the editor is focused
    And " > " is typed
    Then the editor state is "B: foo > |"
