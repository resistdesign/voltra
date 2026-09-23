# Purge real personal data from Person seed history

Goal: remove all real personal data from `scripts/seed-data/Person.csv` while preserving unrelated Voltra history.

- [x] Identify real-person rows in `scripts/seed-data/Person.csv`.
- [x] Remove every non-synthetic person row from the current default branch.
- [x] Rewrite all persistent branch and tag history so every historical `Person.csv` blob is the clean synthetic fixture.
- [x] Force-update `main` only after verifying the rewritten tip tree exactly matched the pre-rewrite tip tree.
- [x] Verify the current fixture contains 297 rows and every row uses only synthetic contact-data patterns.
- [x] Verify every persistent branch/tag history reference uses the same clean `Person.csv` blob.
- [x] Remove the temporary history-rewrite branches.
- [~] Complete GitHub server-side purge of cached/unreachable objects and pull-request refs through GitHub Support.

## GitHub Support handoff

GitHub still serves old unreachable commit/blob views after the repository refs were rewritten. GitHub's documented sensitive-data removal process requires Support to remove cached views, dereference affected pull-request refs, and run server-side garbage collection.

Support analysis:
- Repository: `resistdesign/voltra`
- Affected pull requests: 96
- Affected PR range: `#318` through `#413`
- First sensitive-data commit: `cd3c6924b69dab13dc010418894d3e7d976ebbf4`
- Sensitive path: `scripts/seed-data/Person.csv`
- Branches and tags have already been rewritten and verified clean.
