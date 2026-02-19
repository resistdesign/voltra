# Spec Test Scenario Cram Problem

All of the tests in this project have a problem where multiple scenarios are crammed into one expectation in the spec
file.

The spec files support multiple `tests` for a reason: Multiple scenarios, multiple expectations.

The companion TypeScript files that they reference can stay as one file but should export multiple functions, each
representing a test/scenario in the spec file. That's the whole point of a test having an `export` property.

Please clean-up these tests so that they are still in their same files but the test scenarios are broken up into
appropriate exports.

**BE VERY CAREFUL**, these tests keep this project stable and in order and we want the same *MEANING* and *PURPOSE* of
each test scenario on the other side of this effort.
