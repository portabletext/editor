Feature: Lifecycle

  Background:
    Given the document is "B: foo|"

  Scenario: Read-only stops typing but not sending
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    When "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When Editor A becomes read-only
    And "z" is typed
    Then Editor A shows "B: fooxy|"
    When the server receives Editor A's batch 1
    Then the server has "B: foox"
    When Editor A's batch 1 comes back
    Then Editor A has sent batch 2
    When the server receives Editor A's batch 2
    Then the server has "B: fooxy"

  Scenario: Changes made just before the editor closes go out as a final batch, even with a batch still out
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    When "y" is typed
    Then Editor A has sent nothing new
    When Editor A is closed
    Then Editor A has sent a final batch
    When the server receives Editor A's batch 1
    Then the server has "B: foox"
    When the server receives Editor A's final batch
    Then the server has "B: fooxy"

  Scenario: Closing while sending is blocked sends nothing, and the unsent changes are dropped with a warning
    When "x" is typed
    Then Editor A shows "B: foox|"
    And Editor A has sent batch 1
    When the server's next request fails with 404
    And the server receives Editor A's batch 1
    And the save reply for Editor A's batch 1 arrives
    Then Editor A has sent nothing new
    When "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When Editor A is closed
    Then Editor A has sent nothing new
    And Editor A has been warned
    And the server has "B: foo"

  Scenario: Closing while out of step sends nothing, and the unsent changes are dropped
    When "x" is typed
    Then Editor A has sent batch 1
    When Editor A's feed is lost
    And "y" is typed
    Then Editor A shows "B: fooxy|"
    And Editor A has sent nothing new
    When the server receives Editor A's batch 1
    And Editor A's batch 1 comes back
    Then Editor A has sent nothing new
    When Editor A is closed
    Then Editor A has sent nothing new
    And Editor A has been told work was dropped, with reason "closed out of step"
    And the server has "B: foox"
