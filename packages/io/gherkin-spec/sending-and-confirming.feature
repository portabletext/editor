Feature: Sending and confirming

  Scenario: Queued changes wait for the mutation's echo
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent mutation 1
    And Editor A's sync is "saving"
    When "y" is typed
    And "z" is typed
    Then Editor A shows "B: fooxyz|"
    And Editor A has sent nothing new
    When the server receives Editor A's mutation 1
    Then the server has "B: foox"
    And Editor A has sent nothing new
    When Editor A's mutation 1 comes back
    Then Editor A has sent mutation 2
    When the server receives Editor A's mutation 2
    Then the server has "B: fooxyz"
    When Editor A's mutation 2 comes back
    Then Editor A has sent nothing new
    And Editor A's sync is "synced"

  Scenario: A host that saves each mutation under the transaction ID it proposes never names a transaction, and each mutation is confirmed
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent mutation 1
    When "y" is typed
    And the server receives Editor A's mutation 1
    And Editor A's mutation 1 comes back
    Then Editor A has sent mutation 2
    When the server receives Editor A's mutation 2
    And Editor A's mutation 2 comes back
    Then Editor A shows "B: fooxy|"
    And Editor A's sync is "synced"
    And the server has "B: fooxy"
    And the server saved Editor A's mutation 1 under the transaction ID it proposed
    And the server saved Editor A's mutation 2 under the transaction ID it proposed
    And Editor A's host has not named a transaction

  Scenario: A mutation that changes nothing on the server still comes back, and is confirmed like any other
    Given the document is "B: foo|"
    When the style is set to "h1" in Editor B
    Then Editor B shows "H1: foo|"
    And Editor B has sent mutation 1
    When the server receives Editor B's mutation 1
    Then the server has "H1: foo"
    And Editor A shows "B: foo|"
    When the style is set to "h1"
    Then Editor A shows "H1: foo|"
    And Editor A has sent mutation 1
    When "x" is typed
    Then Editor A shows "H1: foox|"
    And Editor A has sent nothing new
    When the server receives Editor A's mutation 1
    Then the server has "H1: foo"
    When Editor A receives Editor B's mutation 1
    Then Editor A shows "H1: foox|"
    And Editor A has sent nothing new
    When Editor A's mutation 1 comes back
    Then Editor A shows "H1: foox|"
    And Editor A has sent mutation 2
    When the server receives Editor A's mutation 2
    Then the server has "H1: foox"

  Scenario: A rejected mutation stops sending until a resync, which keeps the unsent changes
    Given the document is "B: foo|"
    When the style is set to "h1"
    Then Editor A shows "H1: foo|"
    And Editor A has sent mutation 1
    When "y" is typed
    Then Editor A shows "H1: fooy|"
    And Editor A has sent nothing new
    When the server's next request fails with 400
    And the server receives Editor A's mutation 1
    Then the server has "B: foo"
    When the save reply for Editor A's mutation 1 arrives
    Then Editor A has sent nothing new
    And Editor A shows "H1: fooy|"
    And Editor A's sync is "blocked"
    When "z" is typed
    Then Editor A shows "H1: fooyz|"
    And Editor A has sent nothing new
    When Editor A is resynced
    Then Editor A shows "B: fooyz|"
    And Editor A has been told work was dropped, with reason "rejected"
    And Editor A has sent mutation 2
    When the server receives Editor A's mutation 2
    Then the server has "B: fooyz"

  Scenario: Loading the saved version discards the unsent changes, because the user asked for it
    Given the document is "B: foo|"
    When the style is set to "h1"
    Then Editor A has sent mutation 1
    When "y" is typed
    Then Editor A shows "H1: fooy|"
    When the server's next request fails with 403
    And the server receives Editor A's mutation 1
    And the save reply for Editor A's mutation 1 arrives
    Then Editor A has sent nothing new
    When Editor A is resynced, discarding unsent changes
    Then Editor A shows "B: foo|"
    And Editor A has sent nothing new

  Scenario: A lost save reply is retried with the same transaction ID, and the mutation lands once
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent mutation 1
    When the server receives Editor A's mutation 1
    Then the server has "B: foox"
    When the save reply for Editor A's mutation 1 is lost
    And Editor A's mutation 1 is retried
    Then the retry of Editor A's mutation 1 was refused as a duplicate
    And the server has "B: foox"
    And Editor A has sent nothing new
    When Editor A's mutation 1 comes back
    Then Editor A shows "B: foox|"
    And Editor A's sync is "synced"
    And the server has saved Editor A's mutation 1 once

  Scenario: A request that fails with a 503 is retried with the same transaction ID, and the mutation lands once
    Given the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent mutation 1
    When the server's next request fails with 503
    And the server receives Editor A's mutation 1
    Then the server has "B: foo"
    When the save reply for Editor A's mutation 1 arrives
    Then the server has "B: foox"
    And Editor A's sync is "saving"
    And Editor A has sent nothing new
    When Editor A's mutation 1 comes back
    Then Editor A shows "B: foox|"
    And Editor A's sync is "synced"
    And the server has saved Editor A's mutation 1 once
    And the server saved Editor A's mutation 1 under the transaction ID it proposed

  Scenario: A host with no listener and one writer confirms each mutation itself with the transaction its save answers with
    Given hosts that confirm each mutation themselves
    And the document is "B: foo|"
    When "x" is typed
    Then Editor A has sent mutation 1
    When the server receives Editor A's mutation 1
    Then Editor A is in step
    And Editor A's sync is "synced"
    When "y" is typed
    Then Editor A has sent mutation 2
    When the server receives Editor A's mutation 2
    Then Editor A is in step
    And Editor A's sync is "synced"
    And Editor A shows "B: fooxy|"
    And the server has "B: fooxy"
