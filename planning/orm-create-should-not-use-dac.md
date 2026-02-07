# ORM Create Should Not Use DAC

The ORM `create` function is calling the DAC check function `getItemDACValidation`, and shouldn't because the data does
not exist yet, to control access to it.
And the item does not yet have an id. So the only thing that should be checked it the `CREATE` `DeniedOperations` tag.
Which I believe is already being checked. But you can verify that.
