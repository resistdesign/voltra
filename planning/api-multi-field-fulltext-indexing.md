# API: Multi-Field Fulltext Indexing

Right now, when using the `fulltext` indexing in the `TypeInfoORMService`, you can only designate one field as being
fulltext indexed. You can see that in the configuration for `TypeInfoORMIndexingConfig` -> `fullText` ->
`defaultIndexFieldByType`. `defaultIndexFieldByType` is just a map from TypeInfo Type Name to a *Single* Field Name.

What we *really* need is for the fulltext indexing system to be able to index multiple fields per type and for the shape
of `defaultIndexFieldByType` to be updated accordingly.
