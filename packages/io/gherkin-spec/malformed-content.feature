Feature: Malformed content

  Scenario: Two editors repairing the same missing key of the same revision mint the same key
    Given the server has "B: foo"
    And the server's block has no key
    And the editors are in their first commit
    When Editor A is loaded
    And Editor B is loaded
    And Editor A's first commit ends
    And Editor B's first commit ends
    Then Editor A shows "B _key="52491d2b": foo"
    And Editor B shows "B _key="52491d2b": foo"
    And Editor A has sent batch 1
    And Editor B has sent batch 1
    When the server receives Editor A's batch 1
    Then the server has "B _key="52491d2b": foo"
    When the server receives Editor B's batch 1
    Then the server has "B _key="52491d2b": foo"
    When Editor A's batch 1 comes back
    And Editor A receives Editor B's batch 1
    And Editor B receives Editor A's batch 1
    And Editor B's batch 1 comes back
    Then Editor A is in step
    And Editor B is in step
    And Editor A shows "B _key="52491d2b": foo"
    And Editor B shows "B _key="52491d2b": foo"
    And Editor A has sent nothing new
    And Editor B has sent nothing new
