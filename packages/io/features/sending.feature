Feature: Sending
  The editor and the host are test stand-ins for io's two sides, not the real
  Portable Text Editor or Content Lake. "The editor shows" means the document
  after io's messages to the editor; no UI is rendered.

  Scenario: A change waits for quiet and is then sent
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    Then the editor shows "B: foox"
    And io's sync is "saving"
    And io sends no mutation
    When the quiet wait runs out
    Then io sends mutation 1 that makes it "B: foox"
    And io's sync is "saving"
    And io has mutation 1 in flight that makes it "B: foox"

  Scenario: More typing restarts quiet but the maximum wait flushes it
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the editor changes it to "B: fooxy"
    And the max debounce wait runs out
    Then the editor shows "B: fooxy"
    And io sends mutation 1 that makes it "B: fooxy"
    And io's sync is "saving"

  Scenario: A change at flush joins the mutation
    Given the document is "B: foo"
    When the host reports the feed is lost
    And the editor changes it to "B: foox"
    And the quiet wait runs out
    Then io sends no mutation
    And io's unsent edits make it "B: foox"
    When the editor changes it to "B: fooxy"
    And the host resyncs with "B: foo" at revision 2
    Then io sends mutation 1 that makes it "B: fooxy"
    And the editor shows "B: fooxy"
    And io's sync is "saving"

  Scenario: Changes queue behind the mutation in flight
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the editor changes it to "B: fooxy"
    Then the editor shows "B: fooxy"
    And io sends no mutation
    And io's sync is "saving"
    And io has mutation 1 in flight that makes it "B: foox"
    And io's unsent edits make it "B: fooxy"

  Scenario: The host names the transaction for a mutation
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the host delivers a transaction from revision 1 to 2
    Then io's sync is "saving"
    And io has mutation 1 in flight

  Scenario: An own echo confirms and sends pending work
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the editor changes it to "B: fooxy"
    And the host reports mutation 1 comes back
    Then io sends mutation 2 that makes it "B: fooxy"
    And io's sync is "saving"
    And io has mutation 2 in flight that makes it "B: fooxy"

  Scenario: Waiting for an echo becomes stalled
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the stalled wait runs out
    Then io's sync is "saving (stalled)"
    And io has mutation 1 in flight

  Scenario: A rejected mutation is dropped and unsent edits carry on
    Given the document is "B: foo"
    When the editor changes it to "H1: foo"
    And the quiet wait runs out
    Then the editor shows "H1: foo"
    And io sends mutation 1 that makes it "H1: foo"
    When the editor changes it to "H1: fooy"
    Then the editor shows "H1: fooy"
    And io sends no mutation
    When the host reports mutation 1 is rejected
    Then io reports work dropped, with reason "rejected"
    And the editor shows "B: fooy"
    And io sends mutation 2 that makes it "B: fooy"
    And io's sync is "saving"
    When the host reports mutation 2 comes back
    Then the editor shows "B: fooy"

  Scenario: Closing while a mutation is in flight hands over the rest at once
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    Then io sends mutation 1 that makes it "B: foox"
    When the editor changes it to "B: fooxy"
    And the host asks io to close
    Then io sends mutation 2 that makes it "B: fooxy", marked final
    And io is closed

  Scenario: A repair waits for the mutation in flight, then goes out alone
    Given the document is "B _key=\"b1\": foo"
    When the editor changes it to "B _key=\"b1\": foox"
    And the quiet wait runs out
    Then io sends mutation 1 that makes it "B _key=\"b1\": foox"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    Then io's sync is "blocked"
    And the editor is read-only
    When the host asks io to repair
    Then io sends no mutation
    When the host reports mutation 1 comes back
    Then io sends mutation 2, marked repair
