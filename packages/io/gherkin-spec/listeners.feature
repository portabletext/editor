Feature: Listeners

  Scenario: Listeners hear one change per user action and per received change, none for the first load or their own echoes
    Given the document is "B: foo|"
    Then Editor A has emitted no change
    When "x" is typed
    Then Editor A has emitted 1 change
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    And Editor A's batch 1 comes back
    Then Editor A has emitted 1 change
    When the style is set to "h1" in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor A receives Editor B's batch 1
    Then Editor A shows "H1: foox|"
    And Editor A has emitted 2 changes
