Feature: Discard
  The editor and the host are test stand-ins for io's two sides, not the real
  Portable Text Editor or Content Lake. "The editor shows" means the document
  after io's messages to the editor; no UI is rendered.

  Scenario: Discard without a mutation in flight drops all unsent edits
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the host asks io to discard
    Then io reports work dropped, with reason "discarded"
    And the editor is read-only
    And io's sync is "synced"
    And io sends no mutation

  Scenario: Discard while stalled waits for the mutation to settle
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the editor changes it to "B: fooxy"
    And the stalled wait runs out
    And the host asks io to discard
    Then io reports work dropped, with reason "discarded"
    And io's sync is "saving"
    And io has mutation 1 in flight

  Scenario: The host may name the in-flight mutation while discarding
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the host asks io to discard
    And the host delivers a transaction from revision 1 to 2
    Then io's sync is "saving"
    And io has mutation 1 in flight

  Scenario: An echo confirms the last mutation while discarding
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the host asks io to discard
    And the host reports mutation 1 comes back
    Then io's sync is "synced"
    And io sends no mutation

  Scenario: A rejection drops the last mutation while discarding
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the host asks io to discard
    And the host reports mutation 1 is rejected
    Then io reports work dropped, with reason "rejected"
    And io's sync is "synced"
    And io sends no mutation

  Scenario: Resync while discarding is refused until the mutation settles
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the host asks io to discard
    And the host resyncs with "B: published" at revision 4
    Then io refuses the input as a violation
    And io's sync is "saving"
    And io has mutation 1 in flight

  Scenario: Resync completes discard and unlocks the editor
    Given the document is "B: foo"
    When the host asks io to discard
    And the host resyncs with "B: published" at revision 4
    Then the editor shows "B: published"
    And the editor is not read-only
    And io's sync is "synced"

  Scenario: Closing while discarding reports nothing more
    Given the document is "B: foo"
    When the editor changes it to "B: foox"
    And the quiet wait runs out
    And the host asks io to discard
    And the host asks io to close
    Then io is closed
    And io sends no mutation
