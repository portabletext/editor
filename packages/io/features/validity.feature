Feature: Validity
  The editor and the host are test stand-ins for io's two sides, not the real
  Portable Text Editor or Content Lake. "The editor shows" means the document
  after io's messages to the editor; no UI is rendered.

  Scenario: Invalid received content locks the last good value
    Given the document is "B _key=\"b1\": foo"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    Then the editor shows "B _key=\"b1\": foo"
    And the editor is read-only
    And io's sync is "blocked"

  Scenario: Another writer can make invalid content valid again
    Given the document is "B _key=\"b1\": foo"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    And the host delivers a transaction from revision 2 to 3:
      """
      [{"set": {"[0]._key": "a"}}]
      """
    Then the editor shows "B _key=\"a\": foo"
    And the editor is not read-only
    And io's sync is "synced"

  Scenario: A requested repair is sent when idle
    Given the document is "B _key=\"b1\": foo"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    And the host asks io to repair
    Then io sends mutation 1, marked repair
    And io's sync is "blocked"
    And io has mutation 1 in flight

  Scenario: Invalid while in flight keeps the mutation and blocks pending work
    Given the document is "B _key=\"b1\": foo"
    When the editor changes it to "B _key=\"b1\": foox"
    And the quiet wait runs out
    And the editor changes it to "B _key=\"b1\": fooxy"
    And the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    Then the editor shows "B _key=\"b1\": fooxy"
    And io's sync is "blocked"
    And io has mutation 1 in flight that makes it "B _key=\"b1\": foox"
    And io's unsent edits make it "B _key=\"b1\": fooxy"

  Scenario: Feed loss while invalid takes public precedence
    Given the document is "B _key=\"b1\": foo"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    And the host reports the feed is lost
    Then the editor shows "B _key=\"b1\": foo"
    And io's sync is "out of step"

  Scenario: A repair is cancelled when another writer fixes the field first
    Given the document is "B _key=\"b1\": foo"
    When the editor changes it to "B _key=\"b1\": foox"
    And the quiet wait runs out
    Then io sends mutation 1 that makes it "B _key=\"b1\": foox"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    And the host asks io to repair
    And the host delivers a transaction from revision 2 to 3:
      """
      [{"set": {"[0]._key": "a"}}]
      """
    And the host reports mutation 1 comes back
    Then io sends no mutation
    And the editor is not read-only
    And io's sync is "synced"
