# Feature: API ORM Update Operators

The Type Info ORM API update method needs an argument that allows the consumer to declare how each field will be updated
with a map of field name to operator constant.

For example, we might have a type like:

```
export type MyType = {
  value: number;
  otherValue: number;
};
```

So, for a field that is a number, we could pass a *map* something like to update:

```
{
  value: TypeInfoORMUpdateOperators.NUMBER.INCREMENT,
  otherValue: TypeInfoORMUpdateOperators.NUMBER.DECREMENT,
}
```

This map should probably be passed as part of a third argument to `update`, after `item` and before `context`.
And it should probably be a part of an update config object, not just the map itself.
The potential shape:

```
{
  fieldOperators: { /* Map as from above. */ },
}
```

And other types of values will have update operators like these. Some for string, boolean and maybe arrays. But that's
for later, and out of scope for this plan.

And then the driver API interface/type will obviously need to support this, and the drivers will need to implement each
operator.

The Type Info ORM system will also validate that the operation is compatible with the field type in the Type Info. For
example, you would not try to increment a string. So there needs to be a suite of utilities around this.

The constants will be organized/grouped like this `TypeInfoORMUpdateOperators.NUMBER.INCREMENT`, for good organization.

We will need to update the whole `getTypeInfoORMRouteMap` paradigm to use the update method properly. There should maybe
be an option to turn off passing the update operators for though. Because this is exposing some low-level operations to
potential end users who either don't care or shouldn't be allowed to use them.

Make sure code is properly sectioned off into sensible files and folders, as needed, so that nothing gets bloated.

Finally, we need to update all of the typical things around this and make sure they are well up to standards.
Everything such as tests/doc-comments/documentation/READMEs/demos/examples/samples/call-sites/consumers/etc.
Be thorough.
