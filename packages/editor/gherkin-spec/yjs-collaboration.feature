Feature: Yjs Collaboration

  Background:
    Given two editors with Yjs sync
    And a global keymap

  Scenario: Basic text sync from A to B
    When the editor is focused
    And "hello" is typed
    Then the text is "hello"

  Scenario: Basic text sync from B to A
    When Editor B is focused
    And "world" is typed in Editor B
    Then the text is "world"

  Scenario: Enter key syncs (split_node)
    When the editor is focused
    And "foobar" is typed
    And the caret is put after "foo"
    And "{Enter}" is pressed
    Then the text is "foo|bar"

  Scenario: Backspace at block boundary syncs (merge_node)
    Given the text "foo|bar"
    When the caret is put before "bar"
    And "{Backspace}" is pressed
    Then the text is "foobar"

  Scenario: Concurrent typing in same block
    Given the text "hello world"
    When the caret is put after "hello"
    And "A" is typed
    And the caret is put after "world" in Editor B
    And "B" is typed in Editor B
    Then the text is "helloA worldB"
