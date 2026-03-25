# Fix API Indexing False Missing Indexed Field Error

# Problem:

API Indexing is throwing the error `INDEXING_MISSING_INDEX_FIELD` for an indexed field when that field is not supplied
on and item during creation. (And possibly other operations. Needs further inspections.)

The problem occurs when that field is optional. There is no reason for that error.

In fact, there is no reason for that error, **ever** because validation will take care of throwing when required fields
are missing.

# Solutions:

1. Remove that error entirely. There's no need for it.
2. We can simply assume that that field is just empty and then index based on an empty value. No need to complain,
   validation will handle this particular scenario.

# Additional Requirements:

Find out if indexing is going to cause any other unexpected behavior like this and document it in this plan.

# Finally:

1. Do not overwrite anything in this plan. You may add to it, but keep the basis of the content intact.
2. Review learnings before proceeding.
