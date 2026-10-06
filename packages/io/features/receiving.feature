Feature: Receiving
  The editor and the host are test stand-ins for io's two sides, not the real
  Portable Text Editor or Content Lake. "The editor shows" means the document
  after io's messages to the editor; no UI is rendered.

  Scenario: The next transaction is applied
    Given the document is "B: foo"
    When the host delivers a transaction from revision 1 to 2 that makes it "H1: foo"
    Then the editor shows "H1: foo"
    And io's sync is "synced"

  Scenario: A transaction that skips ahead waits for the missing one
    Given the document is "B: foo"
    When the host delivers a transaction from revision 2 to 3 that makes it "B: fooab"
    Then the editor shows "B: foo"
    And io's sync is "synced"
    When the host delivers a transaction from revision 1 to 2 that makes it "B: fooa"
    Then the editor shows "B: fooab"
    And io's sync is "synced"

  Scenario: More transactions are held while there is a gap
    Given the document is "B: foo"
    When the host delivers a transaction from revision 2 to 3 that makes it "B: fooab"
    And the host delivers a transaction from revision 3 to 4 that makes it "B: fooabc"
    Then the editor shows "B: foo"
    And io's sync is "synced"

  Scenario: A gap that does not fill puts the editor out of step
    Given the document is "B: foo"
    When the host delivers a transaction from revision 2 to 3
    And the gap wait runs out
    Then the editor shows "B: foo"
    And io's sync is "out of step"
    And io sends no mutation

  Scenario: Feed loss while following puts the editor out of step
    Given the document is "B: foo"
    When the host reports the feed is lost
    Then the editor shows "B: foo"
    And io's sync is "out of step"
    And io sends no mutation

  Scenario: Feed loss while waiting for a gap puts the editor out of step
    Given the document is "B: foo"
    When the host delivers a transaction from revision 2 to 3
    And the host reports the feed is lost
    Then the editor shows "B: foo"
    And io's sync is "out of step"
    And io sends no mutation

  Scenario: A patch failure puts the editor out of step
    Given the document is "B _key=\"b1\": foo"
    When the host delivers a transaction from revision 1 to 2:
      """
      [
        {
          "diffMatchPatch": {
            "path": "[_key==\"b1\"].style",
            "value": "not a diff-match-patch"
          }
        }
      ]
      """
    Then the editor shows "B _key=\"b1\": foo"
    And io's sync is "out of step"

  Scenario: A changed own echo puts the editor out of step
    Given the document is "B _key=\"b1\": foo"
    When the editor changes it to "B _key=\"b1\": foox"
    And the quiet wait runs out
    And the host reports mutation 1 comes back changed:
      """
      [
        {
          "set": {
            "[_key==\"b1\"]": {
              "_key": "b1",
              "_type": "block",
              "style": "normal",
              "markDefs": [],
              "children": [
                {"_key": "k1", "_type": "span", "marks": [], "text": "changed"}
              ]
            }
          }
        }
      ]
      """
    Then the editor shows "B _key=\"b1\": foox"
    And io's sync is "out of step"
    When the host resyncs with "B _key=\"b1\": changed" at revision 2
    Then the editor shows "B _key=\"b1\": changed"
    And io's sync is "synced"

  Scenario: A gap while sending is filled without losing either edit
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the host delivers a transaction from revision 2 to 3 that makes it "B: fooab"
    Then io's sync is "saving"
    When the host delivers a transaction from revision 1 to 2 that makes it "B: fooa"
    And the host reports mutation 1 comes back
    Then the editor shows "B: fooabx"
    And io's sync is "synced"

  Scenario: Rejection while out of step drops the sent edit and holds the rest
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the editor changes it to "B: fooxy"
    And the host reports the feed is lost
    And the host reports mutation 1 is rejected
    Then io reports work dropped, with reason "rejected"
    And the editor shows "B: fooy"
    And io sends no mutation
    And io's sync is "out of step"
    And io's unsent edits make it "B: fooy"

  Scenario: A transaction already in the base is skipped
    Given the document is "B: foo"
    When the host delivers a transaction from revision 1 to 2 that makes it "H1: foo"
    And the host delivers a transaction from revision 1 to 2 that makes it "H1: foo"
    Then the editor shows "H1: foo"
    And io's sync is "synced"

  Scenario: A held transaction does not change validity
    Given the document is "B _key=\"b1\": foo"
    When the host delivers a transaction from revision 2 to 3:
      """
      [{"unset": ["[_key==\"b1\"]._key"]}]
      """
    Then the editor is not read-only
    And io's sync is "synced"
