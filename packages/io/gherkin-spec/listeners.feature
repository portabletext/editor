Feature: Listeners

  Scenario: Listeners hear one change per user action and per received change, none for the first load or their own echoes, and only a local change carries patches
    Given the document is "B: foo|"
    Then Editor A has emitted no change
    When "x" is typed
    Then Editor A has emitted 1 change
    And Editor A has sent mutation 1
    And Editor A's change 1 carries the patches of mutation 1
    When the server receives Editor A's mutation 1
    And Editor A's mutation 1 comes back
    Then Editor A has emitted 1 change
    When the style is set to "h1" in Editor B
    Then Editor B has sent mutation 1
    When the server receives Editor B's mutation 1
    And Editor A receives Editor B's mutation 1
    Then Editor A shows "H1: foox|"
    And Editor A has emitted 2 changes
    And Editor A's change 2 carries no patches
