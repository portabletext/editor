Feature: Out of step and resync

  Scenario: A transaction that skips ahead is held until the missing one arrives
    Given the document is "B: foo|"
    When the style is set to "h1" in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "H1: foo"
    When Editor B's batch 1 comes back
    Then Editor B has sent nothing new
    When the style is set to "h2" in Editor B
    Then Editor B has sent batch 2
    When the server receives Editor B's batch 2
    Then the server has "H2: foo"
    When Editor A receives Editor B's batch 2
    Then Editor A shows "B: foo|"
    And Editor A is in step
    When Editor A receives Editor B's batch 1
    Then Editor A shows "H2: foo|"
    And Editor A is in step

  Scenario: A transaction that skips ahead and never connects puts the editor out of step until it's resynced
    Given the document is "B: foo|"
    When the style is set to "h1" in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor B's batch 1 comes back
    And the style is set to "h2" in Editor B
    Then Editor B has sent batch 2
    When the server receives Editor B's batch 2
    Then the server has "H2: foo"
    When Editor A receives Editor B's batch 2
    Then Editor A shows "B: foo|"
    When the wait for the missing transaction runs out
    Then Editor A reports that it is out of step
    And Editor A shows "B: foo|"
    When Editor A receives Editor B's batch 1
    Then Editor A shows "B: foo|"
    When Editor A is resynced
    Then Editor A shows "H2: foo|"
    And Editor A is in step

  Scenario: A transaction the resync copy already covers is dropped by the host
    Given the document is "B: foo|"
    When the style is set to "h1" in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "H1: foo"
    When Editor A is resynced
    Then Editor A shows "H1: foo|"
    When Editor A receives Editor B's batch 1
    And the wait for the missing transaction runs out
    Then Editor A is in step
    And Editor A shows "H1: foo|"

  Scenario: A transaction that touches only another field moves the revision and changes nothing
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    And Editor A has emitted 1 change
    When another field of the document is changed on the server
    And Editor A receives the other field's change
    Then Editor A shows "B: foox|"
    And Editor A has emitted 1 change
    And Editor A is in step
    When the style is set to "h1" in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "H1: foo"
    When Editor A receives Editor B's batch 1
    Then Editor A shows "H1: foox|"
    And Editor A is in step

  Scenario: A change for content the editor no longer has does nothing, as on the server
    Given the document is "B: foo|;;B: bar"
    When the block "bar" is deleted
    Then Editor A shows "B: foo|"
    And Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foo"
    When Editor A's batch 1 comes back
    Then Editor A has sent nothing new
    When the caret is put after "bar" in Editor B
    And "y" is typed in Editor B
    Then Editor B shows "B: foo;;B: bary|"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "B: foo"
    When Editor A receives Editor B's batch 1
    Then Editor A shows "B: foo|"
    And Editor A is in step
    When Editor B receives Editor A's batch 1
    Then Editor B shows "B: foo"
    When Editor B's batch 1 comes back
    Then Editor B shows "B: foo"
    And Editor B has sent nothing new
    And Editor B is in step

  Scenario: A resync requested before the batch in flight has an outcome is refused
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    When "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When the server receives Editor A's batch 1
    Then the server has "B: foox"
    When Editor A is resynced
    Then the resync is refused
    And Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When Editor A's batch 1 is accepted
    And Editor A's batch 1 comes back
    Then Editor A has sent batch 2

  Scenario: A deleted and recreated document doesn't put the editor out of step
    Given the document is "B: foo|"
    When the document is deleted
    Then the server has no document
    When Editor A receives the deletion
    Then Editor A shows "B: |"
    And Editor A is in step
    When the document is recreated as "B: bar"
    Then the server has "B: bar"
    When Editor A receives the recreation
    Then Editor A shows "B: bar"
    And Editor A is in step

  Scenario: An echo that skips ahead is held, confirms the batch, and keeps the typing on screen
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    When the style is set to "h1" in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And the server receives Editor A's batch 1
    Then the server has "H1: foox"
    When Editor A's batch 1 comes back
    Then Editor A shows "B: foox|"
    When "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent batch 2
    When Editor A receives Editor B's batch 1
    Then Editor A shows "H1: fooxy|"
    And Editor A is in step
