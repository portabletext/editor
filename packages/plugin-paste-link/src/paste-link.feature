Feature: Paste Link

  Background:
    Given a global keymap

  Scenario: Paste URL on selected text
    Given the editor state is "B: click here"
    When the editor is focused
    And "click here" is selected
    And data is pasted
      | text/plain | https://example.com |
    Then the editor state is "B: [@link _key=\"l1\" href=\"https://example.com\":click here]"

  Scenario: Paste URL on existing link replaces it
    Given the editor state is "B: foo bar baz"
    And a "link" "k1" around "oo bar ba"
    When the editor is focused
    And "bar" is selected
    And data is pasted
      | text/plain | https://newurl.com |
    Then the editor state is "B: f[@link _key=\"k1\":oo ][@link _key=\"l1\" href=\"https://newurl.com\":bar][@link _key=\"k1\": ba]z"

  Scenario: Paste URL at collapsed selection
    Given the editor state is "B: before"
    When the editor is focused
    And the caret is put after "before"
    And data is pasted
      | text/plain | https://example.com |
    Then the editor state is "B: before[@link _key=\"l1\" href=\"https://example.com\":https://example.com]"

  Scenario: Paste URL preserves strong decorator
    Given the editor state is "B: text"
    And "strong" around "text"
    When the editor is focused
    And the caret is put after "text"
    And data is pasted
      | text/plain | https://example.com |
    Then the editor state is "B: [strong:text][strong:[@link _key=\"l1\" href=\"https://example.com\":https://example.com]]"

  Scenario: Pasting non-URL inside decorator
    Given the editor state is "B: foo bar"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put after "foo b"
    And data is pasted
      | text/plain | new |
    Then the editor state is "B: foo [strong:bnew|ar]"

  Scenario: Pasting non-URL inside annotation
    Given the editor state is "B: foo bar"
    And a "link" "k1" around "bar"
    When the editor is focused
    And the caret is put after "foo b"
    And data is pasted
      | text/plain | new |
    Then the editor state is "B: foo [@link _key=\"k1\":b][@link _key=\"l1\":new][@link _key=\"k1\":ar]"

  Scenario: Non-URL text is pasted normally
    Given the editor state is "B: before"
    When the editor is focused
    And the caret is put after "before"
    And data is pasted
      | text/plain | hello world |
    Then the editor state is "B: beforehello world|"

  Scenario: Unsupported protocol is pasted as plain text
    Given the editor state is "B: before"
    When the editor is focused
    And the caret is put after "before"
    And data is pasted
      | text/plain | ftp://example.com |
    Then the editor state is "B: beforeftp://example.com|"
