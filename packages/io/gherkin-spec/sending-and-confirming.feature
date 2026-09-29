Feature: Sending and confirming

  Background:
    Given the document is "B: foo|"

  Scenario: Queued changes wait for the batch's echo
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    And Editor A's sync is "saving"
    When "y" is typed
    And "z" is typed
    Then Editor A shows "B: fooxyz|"
    And Editor A has sent nothing new
    When the server receives Editor A's batch 1
    Then the server has "B: foox"
    And Editor A has sent nothing new
    When Editor A's batch 1 comes back
    Then Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: fooxyz"
    When Editor A's batch 2 comes back
    Then Editor A has sent nothing new
    And Editor A's sync is "synced"

  Scenario: A batch that changes nothing on the server still comes back, and is confirmed like any other
    When the style is set to "h1" in Editor B
    Then Editor B shows "H1: foo|"
    And Editor B has sent batch 1
    When the server receives Editor B's batch 1
    Then the server has "H1: foo"
    And Editor A shows "B: foo|"
    When the style is set to "h1"
    Then Editor A shows "H1: foo|"
    And Editor A has sent batch 1
    When "x" is typed
    Then Editor A shows "H1: foox|"
    And Editor A has sent nothing new
    When the server receives Editor A's batch 1
    Then the server has "H1: foo"
    When Editor A receives Editor B's batch 1
    Then Editor A shows "H1: foox|"
    And Editor A has sent nothing new
    When Editor A's batch 1 comes back
    Then Editor A shows "H1: foox|"
    And Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "H1: foox"

  Scenario: A rejected batch stops sending until a resync, which keeps the unsent changes
    When the style is set to "h1"
    Then Editor A shows "H1: foo|"
    And Editor A has sent batch 1
    When "y" is typed
    Then Editor A shows "H1: fooy|"
    And Editor A has sent nothing new
    When the server refuses Editor A's batch 1
    Then the server has "B: foo"
    When Editor A's batch 1 is rejected
    Then Editor A has sent nothing new
    And Editor A shows "H1: fooy|"
    And Editor A's sync is "blocked"
    When "z" is typed
    Then Editor A shows "H1: fooyz|"
    And Editor A has sent nothing new
    When Editor A is resynced
    Then Editor A shows "B: fooyz|"
    And Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: fooyz"

  Scenario: Loading the saved version discards the unsent changes, because the user asked for it
    When the style is set to "h1"
    Then Editor A has sent batch 1
    When "y" is typed
    Then Editor A shows "H1: fooy|"
    When the server refuses Editor A's batch 1
    And Editor A's batch 1 is rejected
    Then Editor A has sent nothing new
    When Editor A is resynced, discarding unsent changes
    Then Editor A shows "B: foo|"
    And Editor A has sent nothing new

  Scenario: A lost save reply is retried with the same transaction ID, and the batch lands once
    When "x" is typed
    Then Editor A has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B: foox"
    When the save reply for Editor A's batch 1 is lost
    And Editor A's batch 1 is retried
    Then the retry of Editor A's batch 1 was refused as a duplicate
    And the server has "B: foox"
    And Editor A has sent nothing new
    When Editor A's batch 1 comes back
    Then Editor A shows "B: foox|"
    And Editor A's sync is "synced"
    And the server has saved Editor A's batch 1 once
