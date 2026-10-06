Feature: Lifecycle
  The editor and the host are test stand-ins for io's two sides, not the real
  Portable Text Editor or Content Lake. "The editor shows" means the document
  after io's messages to the editor; no UI is rendered.

  Scenario: Load gives the editor the server copy
    Given a new io
    When the host loads "B: foo" at revision 1
    Then the editor shows "B: foo"
    And io's sync is "synced"

  Scenario: Transactions heard during loading are applied after the editor is ready
    Given a new io
    When the host delivers a transaction from revision 1 to 2 that makes it "H1: foo"
    And the host loads "B: foo" at revision 1
    And the editor becomes ready
    Then the editor shows "H1: foo"
    And io's sync is "synced"

  Scenario: Transactions already included in the load are skipped on ready
    Given a new io
    When the host delivers a transaction from revision 1 to 2 that makes it "H1: foo"
    And the host loads "H1: foo" at revision 2
    And the editor becomes ready
    Then the editor shows "H1: foo"
    And io's sync is "synced"

  Scenario: A transaction left over on ready starts a gap wait
    Given a new io
    When the host delivers a transaction from revision 7 to 8
    And the host loads "B: foo" at revision 1
    And the editor becomes ready
    Then the editor shows "B: foo"
    And io's sync is "synced"

  Scenario: Closing during loading closes without work
    Given a new io
    When the host asks io to close
    Then io is closed
    And io sends no mutation

  Scenario: Loading after ready is a violation
    Given the document is "B: foo"
    When the host loads "B: bar" at revision 2
    Then io refuses the input as a violation
    And the editor shows "B: foo"
    And io's sync is "synced"

  Scenario: Resync replaces the base and keeps unsent work
    Given the document is "B: foo"
    When the host reports the feed is lost
    And the editor changes it to "B: foox"
    And the host resyncs with "H1: foo" at revision 3
    Then the editor shows "H1: foox"
    And io sends mutation 1 that makes it "H1: foox"
    And io's sync is "saving"

  Scenario: Closing normally sends unsent work as final
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the host asks io to close
    Then io sends mutation 1 that makes it "B: foox", marked final
    And io is closed

  Scenario: Closing while invalid drops unsent work
    Given the document is "B _key=\"b1\": foo"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    And the editor changes it to "B _key=\"b1\": foox"
    And the host asks io to close
    Then io reports work dropped, with reason "closed while invalid"
    And io is closed

  Scenario: Ready before load is a violation
    Given a new io
    When the editor becomes ready
    Then io refuses the input as a violation
    And io is loading

  Scenario: Resync with a mutation in flight must say how it ended
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    Then io sends mutation 1 that makes it "B: foox"
    When the host resyncs with "B: foo" at revision 2
    Then io refuses the input as a violation
    And io's sync is "saving"

  Scenario: Resync confirms an in-flight mutation that landed
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    Then io sends mutation 1 that makes it "B: foox"
    When the host resyncs with "B: foox" at revision 2, mutation 1 applied
    Then the editor shows "B: foox"
    And io sends no mutation
    And io's sync is "synced"

  Scenario: Resync sends again an in-flight mutation that did not land
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    Then io sends mutation 1 that makes it "B: foox"
    When the host resyncs with "B: foo" at revision 2, mutation 1 not applied
    Then the editor shows "B: foox"
    And io sends mutation 2 that makes it "B: foox"
    And io's sync is "saving"

  Scenario: Closing while out of step still sends unsent work as final
    Given the document is "B: foo"
    When the host reports the feed is lost
    And the editor changes it to "B: foox"
    And the host asks io to close
    Then io sends mutation 1 that makes it "B: foox", marked final
    And io is closed
