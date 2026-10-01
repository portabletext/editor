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
    And Editor A's sync is "out of step"
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
    When Editor A's batch 1 comes back
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

  Scenario: The feed is lost while a batch is in flight, and the batch had landed
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foox"
    When Editor A's feed is lost
    Then Editor A has been warned
    And Editor A's sync is "out of step"
    When "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When Editor A is resynced with the outcome of batch 1
    Then Editor A shows "B: fooxy|"
    And Editor A has sent batch 2
    And Editor A's sync is "saving"
    When Editor A's batch 1 comes back
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When the server receives Editor A's batch 2
    Then the server has "B: fooxy"
    When Editor A's batch 2 comes back
    Then Editor A shows "B: fooxy|"
    And Editor A is in step
    And Editor A's sync is "synced"

  Scenario: The feed is lost while a batch is in flight, and the batch had not landed
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent batch 1
    When Editor A's feed is lost
    And "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When the server's next request fails with 404
    And the server receives Editor A's batch 1
    Then the server has "B: foo"
    When the server's next request fails with 404
    And Editor A is resynced with the outcome of batch 1
    Then Editor A shows "B: fooxy|"
    And Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: fooxy"
    When Editor A's batch 2 comes back
    Then Editor A shows "B: fooxy|"
    And Editor A is in step
    And Editor A's sync is "synced"

  Scenario: An editor out of step sends nothing, even after its batch comes back, until the resync re-keys its unsent insert
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent batch 1
    When the block "B _key="k9": baz" is inserted
    Then Editor A shows "B: foox;;B _key="k9": baz|"
    And Editor A has sent nothing new
    When the block "B _key="k9": bar" is inserted in Editor B
    Then Editor B has sent batch 1
    When the server receives Editor B's batch 1
    And Editor A receives Editor B's batch 1
    Then Editor A reports that it is out of step, with reason "duplicate key"
    When the server receives Editor A's batch 1
    Then the server has "B: foox;;B _key="k9": bar"
    When Editor A's batch 1 comes back
    Then Editor A has sent nothing new
    And Editor A's sync is "out of step"
    When "y" is typed
    Then Editor A shows "B: foox;;B _key="k9": bazy|"
    And Editor A has sent nothing new
    When Editor A is resynced
    Then Editor A is in step
    And Editor A shows "B: foox;;B: bazy;;B _key="k9": bar|"
    And Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: foox;;B: bazy;;B _key="k9": bar"
    And every block on the server has a unique key

  Scenario: A host that rewrites a keyed removal as a whole-field unset is caught when the echo comes back
    Given the document is "B: foo|;;B: bar"
    When the block "bar" is deleted
    Then Editor A shows "B: foo|"
    And Editor A has sent batch 1
    When the host rewrites Editor A's batch 1 as a whole-field unset
    Then the server has no field
    When Editor A's batch 1 comes back
    Then Editor A reports that it is out of step
    And Editor A's sync is "out of step"
    And Editor A shows "B: foo|"
    When Editor A is resynced
    Then Editor A shows "B: |"
    And Editor A is in step
    And Editor A's sync is "synced"

  Scenario: The quiet document: the feed dies before the echo, and the host finds the batch had landed by re-submitting it
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foox"
    When Editor A's feed is lost
    And Editor A is resynced with the outcome of batch 1
    Then the retry of Editor A's batch 1 was refused as a duplicate
    And Editor A is in step
    And Editor A's sync is "synced"
    And Editor A shows "B: foox|"
    And the server has "B: foox"
    And the server has saved Editor A's batch 1 once

  # known red: no stalled state
  @skip
  Scenario: The quiet document, and the host never says the feed is lost: the user is told saving has stalled
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foox"
    When 60 seconds pass
    Then Editor A has been warned
    And Editor A's sync is "stalled"
