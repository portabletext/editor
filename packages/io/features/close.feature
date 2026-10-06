Feature: Close
  The editor and the host are test stand-ins for io's two sides, not the real
  Portable Text Editor or Content Lake. "The editor shows" means the document
  after io's messages to the editor; no UI is rendered.

  Scenario: Late host deliveries after close do not change anything
    Given a new io
    When the host asks io to close
    And the host delivers a transaction from revision 1 to 2
    And the host reports mutation 1 was sent as transaction "t1"
    And the host reports mutation 1 is rejected
    And the host reports the feed is lost
    Then io is closed
    And io sends no mutation

  Scenario: Other input after close is a violation
    Given the document is "B: foo"
    When the host asks io to close
    And the editor changes it to "B: foox"
    Then io refuses the input as a violation
    And io is closed
    And io sends no mutation
