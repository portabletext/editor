Feature: Loading and empty

  Scenario: A load in the first commit makes the editor ready with the content, and no change
    Given the server has "B: foo"
    And the editors are in their first commit
    When Editor A is loaded
    Then Editor A's status is "loading"
    When Editor A's first commit ends
    Then Editor A's status is "ready"
    And Editor A shows "B: foo"
    And Editor A has emitted no change

  Scenario: An editor nobody loads is ready and empty when its first commit ends, and a resync fills it
    Given the server has "B: foo"
    And the editors are in their first commit
    When Editor A's first commit ends
    Then Editor A's status is "ready"
    And Editor A shows "B: |"
    When Editor A is resynced
    Then Editor A shows "B: foo"

  Scenario: A load after the editor is ready is refused
    Given the server has "B: foo"
    And the editors are in their first commit
    When Editor A's first commit ends
    And Editor A is loaded again
    Then the load was refused
    And Editor A shows "B: |"

  Scenario Outline: An empty field shows the placeholder, and a lone empty block is real content (the server has <copy>)
    Given the server has <copy>
    And the editors are in their first commit
    When Editor A is loaded
    And Editor A's first commit ends
    Then Editor A shows "B: |"
    When "x" is typed
    Then Editor A shows "B: x|"
    And Editor A has sent mutation 1
    And Editor A's mutation 1 <patches>
    When the server receives Editor A's mutation 1
    Then the server has "<server>"
    When Editor A's mutation 1 comes back
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
    And Editor A has sent mutation 1
    And Editor A's mutation 1 empties the field
    When the server receives Editor A's mutation 1
    Then the server has no field
    When Editor A's mutation 1 comes back
    Then Editor A shows "B: |"
    And Editor A has sent nothing new
