Feature: Loading and empty

  Scenario: An editor that doesn't claim the first load starts ready and empty, and a resync fills it
    Given the server has "B: foo"
    And an editor that doesn't claim the first load
    Then Editor A's status is "ready"
    And Editor A shows "B: |"
    When Editor A is resynced
    Then Editor A shows "B: foo"

  Scenario: An editor that claims the first load waits for it
    Given the server has "B: foo"
    And an editor that claims the first load
    Then Editor A's status is "loading"
    When Editor A is loaded
    Then Editor A's status is "ready"
    And Editor A shows "B: foo"
    And Editor A has emitted no change

  Scenario: Releasing the claim makes the editor ready and empty
    Given the server has "B: foo"
    And an editor that claims the first load
    When the claim is released
    Then Editor A's status is "ready"
    And Editor A shows "B: |"

  Scenario Outline: An empty field shows the placeholder, and a lone empty block is real content (the server has <copy>)
    Given the server has <copy>
    And an editor that claims the first load
    When Editor A is loaded
    Then Editor A shows "B: |"
    When "x" is typed
    Then Editor A shows "B: x|"
    And Editor A has sent batch 1
    And Editor A's batch 1 <patches>
    When the server receives Editor A's batch 1
    Then the server has "<server>"
    When Editor A's batch 1 comes back
    Then Editor A has sent nothing new

    Examples:
      | copy                 | patches                 | server         |
      | no document          | creates the block       | B: x           |
      | no field             | creates the block       | B: x           |
      | an empty list        | creates the block       | B: x           |
      | one empty block "b1" | does not create a block | B _key="b1": x |

  Scenario: Emptying the field sends a whole-field unset
    Given the document is "B: foo|"
    When the block "foo" is deleted
    Then Editor A shows "B: |"
    And Editor A has sent batch 1
    And Editor A's batch 1 empties the field
    When the server receives Editor A's batch 1
    Then the server has no field
    When Editor A's batch 1 comes back
    Then Editor A shows "B: |"
    And Editor A has sent nothing new
