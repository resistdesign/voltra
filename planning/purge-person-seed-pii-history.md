# Purge real personal data from Person seed history

Goal: remove all real personal data from `scripts/seed-data/Person.csv` while preserving unrelated Voltra history.

- [x] Identify live real-person rows in `scripts/seed-data/Person.csv`.
- [x] Remove all real-person rows from the current default branch.
- [~] Rewrite reachable Git history so historical versions of `Person.csv` contain only fake seed people.
- [ ] Rewrite/update affected branch and tag refs as needed.
- [ ] Verify current code search and reachable history no longer expose the removed personal data.
- [ ] Document any GitHub cache / pull-request-ref cleanup that requires GitHub Support.


## Current blocker

- [~] Blocked by GitHub branch protection on `main`: GitHub rejected the required history force-push because `main` requires pull requests and disallows force pushes. Other rewritten branches were pushed before the rejection; tags have not yet been pushed.
