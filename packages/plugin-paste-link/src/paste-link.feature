Feature: Paste Link

  Background:
    Given a global keymap

  Scenario: Paste URL on selected text
    Given the text "click here"
    When the editor is focused
    And "click here" is selected
    And data is pasted
      | text/plain | https://example.com |
    Then the text is "click here"
    And "click here" has marks "k4"

  Scenario: Paste URL on existing link replaces it
    Given the text "foo bar baz"
    And a "link" "k1" around "oo bar ba"
    When the editor is focused
    And "bar" is selected
    And data is pasted
      | text/plain | https://newurl.com |
    Then the text is "f,oo ,bar, ba,z"
    And "oo " has marks "k1"
    And "bar" has marks "k9"
    And " ba" has marks "k1"

  Scenario: Paste URL at collapsed selection
    Given the text "before"
    When the editor is focused
    And the caret is put after "before"
    And data is pasted
      | text/plain | https://example.com |
    Then the text is "before,https://example.com"
    And "https://example.com" has marks "k4"

  Scenario: Paste URL preserves strong decorator
    Given the text "text"
    And "strong" around "text"
    When the editor is focused
    And the caret is put after "text"
    And data is pasted
      | text/plain | https://example.com |
    Then the text is "text,https://example.com"
    And "https://example.com" has marks "strong,k4"

  Scenario: Pasting non-URL inside decorator
    Given the text "foo bar"
    And "strong" around "bar"
    When the editor is focused
    And the caret is put after "foo b"
    And data is pasted
      | text/plain | new |
    Then the text is "foo ,bnewar"

  Scenario: Pasting non-URL inside annotation
    Given the text "foo bar"
    And a "link" "k1" around "bar"
    When the editor is focused
    And the caret is put after "foo b"
    And data is pasted
      | text/plain | new |
    Then the text is "foo ,b,new,ar"

  Scenario: Non-URL text is pasted normally
    Given the text "before"
    When the editor is focused
    And the caret is put after "before"
    And data is pasted
      | text/plain | hello world |
    Then the text is "beforehello world"

  Scenario: Unsupported protocol is pasted as plain text
    Given the text "before"
    When the editor is focused
    And the caret is put after "before"
    And data is pasted
      | text/plain | ftp://example.com |
    Then the text is "beforeftp://example.com"
    And "ftp://example.com" has no marks
