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
    Then io sends mutation 1 that makes it "B: foo"
    And io's sync is "blocked"
    And io has mutation 1 in flight
    When the host reports mutation 1 comes back
    Then the editor is not read-only
    And io's sync is "synced"

  Scenario: Invalid while in flight keeps the mutation and blocks pending work
    Given the document is "B _key=\"b1\": foo;;B _key=\"b2\": bar"
    When the editor changes it to "B _key=\"b1\": foox;;B _key=\"b2\": bar"
    And the quiet wait runs out
    And the editor changes it to "B _key=\"b1\": fooxy;;B _key=\"b2\": bar"
    And the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b2\"]._key"]}]
      """
    Then the editor shows "B _key=\"b1\": fooxy;;B _key=\"b2\": bar"
    And io's sync is "blocked"
    And io has mutation 1 in flight that makes it "B _key=\"b1\": foox;;B: bar"
    And io's unsent edits make it "B _key=\"b1\": fooxy;;B: bar"

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
    Given the document is "B _key=\"b1\": foo;;B _key=\"b2\": bar"
    When the editor changes it to "B _key=\"b1\": foox;;B _key=\"b2\": bar"
    And the quiet wait runs out
    Then io sends mutation 1 that makes it "B _key=\"b1\": foox;;B _key=\"b2\": bar"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b2\"]._key"]}]
      """
    And the host asks io to repair
    And the host delivers a transaction from revision 2 to 3:
      """
      [{"set": {"[1]._key": "b3"}}]
      """
    And the host reports mutation 1 comes back
    Then io sends no mutation
    And the editor is not read-only
    And io's sync is "synced"

  Scenario: A repair is computed on the base it goes out on
    Given the document is "B _key=\"b1\": foo;;B _key=\"b2\": bar"
    When the editor changes it to "B _key=\"b1\": foox;;B _key=\"b2\": bar"
    And the quiet wait runs out
    And the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b2\"]._key"]}]
      """
    And the host asks io to repair
    And the host delivers a transaction from revision 2 to 3:
      """
      [
        {
          "insert": {
            "after": "[1]",
            "items": [
              {
                "_type": "block",
                "style": "normal",
                "markDefs": [],
                "children": [
                  {"_key": "k9", "_type": "span", "marks": [], "text": "baz"}
                ]
              }
            ]
          }
        }
      ]
      """
    And the host reports mutation 1 comes back
    Then io sends mutation 2 that makes it "B _key=\"b1\": foox;;B: bar;;B: baz"
    When the host reports mutation 2 comes back
    Then the editor shows "B _key=\"b1\": foox;;B: bar;;B: baz"
    And the editor is not read-only
    And io's sync is "synced"

  Scenario: A correction to another writer's content is not saved and makes the field invalid
    Given the document is "B _key=\"b1\": foo"
    When the host delivers a transaction from revision 1 to 2:
      """
      [
        {
          "insert": {
            "after": "[_key==\"b1\"]",
            "items": [
              {
                "_key": "b2",
                "_type": "block",
                "style": "normal",
                "markDefs": [],
                "children": []
              }
            ]
          }
        }
      ]
      """
    And the editor corrects it to "B _key=\"b1\": foo;;B _key=\"b2\": "
    And the quiet wait runs out
    Then io sends no mutation
    And the editor is read-only
    And io's sync is "blocked"

  Scenario: A repair requested while edits wait goes out before them
    Given the document is "B _key=\"b1\": foo;;B _key=\"b2\": bar"
    When the editor changes it to "B _key=\"b1\": foox;;B _key=\"b2\": bar"
    And the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b2\"]._key"]}]
      """
    And the quiet wait runs out
    Then io sends no mutation
    And io's sync is "blocked"
    When the host asks io to repair
    Then io sends mutation 1 that makes it "B _key=\"b1\": foo;;B: bar"
    When the host reports mutation 1 comes back
    And the quiet wait runs out
    Then io sends mutation 2 that makes it "B _key=\"b1\": foox;;B: bar"
    And io's sync is "saving"

  Scenario: A repair refused because the document moved is worked out again on the new revision
    Given the document is "B _key=\"b1\": foo;;B _key=\"b2\": bar"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b2\"]._key"]}]
      """
    And the host asks io to repair
    Then io sends mutation 1 that makes it "B _key=\"b1\": foo;;B: bar", only at revision 2
    When the host reports mutation 1 is rejected because the document moved
    Then io sends no mutation
    And io's sync is "blocked"
    And the editor is read-only
    When the host delivers a transaction from revision 2 to 3:
      """
      [{"set": {"[_key==\"b1\"].children[0].text": "food"}}]
      """
    Then io sends mutation 2 that makes it "B _key=\"b1\": food;;B: bar", only at revision 3

  Scenario: A refused repair is not sent again once another writer's repair arrives
    Given the document is "B _key=\"b1\": foo;;B _key=\"b2\": bar"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b2\"]._key"]}]
      """
    And the host asks io to repair
    Then io sends mutation 1 that makes it "B _key=\"b1\": foo;;B: bar", only at revision 2
    When the host reports mutation 1 is rejected because the document moved
    And the host delivers a transaction from revision 2 to 3:
      """
      [{"set": {"[1]._key": "b3"}}]
      """
    Then io sends no mutation
    And the editor shows "B _key=\"b1\": foo;;B _key=\"b3\": bar"
    And the editor is not read-only
    And io's sync is "synced"

  Scenario: A repair rejected for another reason is dropped and the field stays invalid
    Given the document is "B _key=\"b1\": foo;;B _key=\"b2\": bar"
    When the host delivers a transaction from revision 1 to 2:
      """
      [{"unset": ["[_key==\"b2\"]._key"]}]
      """
    And the host asks io to repair
    Then io sends mutation 1 that makes it "B _key=\"b1\": foo;;B: bar", only at revision 2
    When the host reports mutation 1 is rejected
    Then io reports work dropped that would have made it "B _key=\"b1\": foo;;B: bar", with reason "rejected"
    And io sends no mutation
    And io's sync is "blocked"
    And the editor is read-only
    When the host delivers a transaction from revision 2 to 3:
      """
      [{"set": {"[_key==\"b1\"].children[0].text": "food"}}]
      """
    Then io sends no mutation
