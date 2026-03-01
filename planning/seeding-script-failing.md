# Seeding Script Failing

The demo site seeding script `scripts/seed-demo-db.ts` is failing locally and in CI.
This was not happening before the last plan `planning/archived/api-multi-field-fulltext-indexing.md` that was executed.

Script Error:

```
yarn tsx ./scripts/seed-demo-db.ts
yarn run v1.22.22

node:internal/modules/run_main:122
    triggerUncaughtException(
    ^
{
  message: 'Failed to create or update Person',
  typeName: 'Person',
  item: {
    id: '817180cc-1891-407a-a51f-41c4647e8466',
    firstName: 'Diana',
    lastName: 'Garcia',
    age: 41,
    phoneNumber: "'+1 (555) 880-9101",
    email: 'diana.garcia@test.org',
    car: undefined,
    dietaryRestrictions: 'Vegetarian'
  },
  createError: { status: 'Internal Server Error' },
  updateError: { status: 'Internal Server Error' }
}

Node.js v22.14.0
error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
```

Cloud Watch API Lambda Logs:

```
INFO LOGGING_FUNCTION_CALL INPUT "db"/"create" : [ "Person", { "id": "817180cc-1891-407a-a51f-41c4647e8466", "firstName": "Diana", "lastName": "Garcia", "age": 41, "phoneNumber": "'+1 (555) 880-9101", "email": "diana.garcia@test.org", "dietaryRestrictions": "Vegetarian" } ]
Link 
2026-03-01T00:21:13.317Z	51305605-9a1e-4d96-aa7f-56d48932e461	INFO	LOGGING_FUNCTION_CALL INPUT "db"/"create" : [
  "Person",
  
{
    "id": "817180cc-1891-407a-a51f-41c4647e8466",
    "firstName": "Diana",
    "lastName": "Garcia",
    "age": 41,
    "phoneNumber": "'+1 (555) 880-9101",
    "email": "diana.garcia@test.org",
    "dietaryRestrictions": "Vegetarian"
}

]

---

ERROR	LOGGING_FUNCTION_CALL ERROR "db"/"create" : {
  typeName: 'Person',
  valid: false,
  error: { code: 'INVALID_TYPE', values: undefined },
  errorMap: {
    firstName: [ [Object] ],
    lastName: [ [Object] ],
    age: [ [Object] ],
    phoneNumber: [ [Object] ],
    email: [ [Object] ],
    car: [ [Object] ],
    likesCheese: [ [Object] ],
    dietaryRestrictions: [ [Object] ]
  }
}

---

INFO LOGGING_FUNCTION_CALL INPUT "db"/"update" : [ "Person", { "id": "817180cc-1891-407a-a51f-41c4647e8466", "firstName": "Diana", "lastName": "Garcia", "age": 41, "phoneNumber": "'+1 (555) 880-9101", "email": "diana.garcia@test.org", "dietaryRestrictions": "Vegetarian" } ]
Link 
2026-03-01T00:21:13.378Z	86084553-157f-450e-b9c1-3c0f9467709f	INFO	LOGGING_FUNCTION_CALL INPUT "db"/"update" : [
  "Person",
  
{
    "id": "817180cc-1891-407a-a51f-41c4647e8466",
    "firstName": "Diana",
    "lastName": "Garcia",
    "age": 41,
    "phoneNumber": "'+1 (555) 880-9101",
    "email": "diana.garcia@test.org",
    "dietaryRestrictions": "Vegetarian"
}

]

---

ERROR LOGGING_FUNCTION_CALL ERROR "db"/"update" : { typeName: 'Person', valid: false, error: { code: 'INVALID_TYPE', values: undefined }, errorMap: { id: [ [Object] ], firstName: [ [Object] ], lastName: [ [Object] ], age: [ [Object] ], phoneNumber: [ [Object] ], email: [ [Object] ], car: [ [Object] ], likesCheese: [ [Object] ], dietaryRestrictions: [ [Object] ] } }
Link 
2026-03-01T00:21:13.379Z	86084553-157f-450e-b9c1-3c0f9467709f	ERROR	LOGGING_FUNCTION_CALL ERROR "db"/"update" : {
  typeName: 'Person',
  valid: false,
  error: { code: 'INVALID_TYPE', values: undefined },
  errorMap: {
    id: [ [Object] ],
    firstName: [ [Object] ],
    lastName: [ [Object] ],
    age: [ [Object] ],
    phoneNumber: [ [Object] ],
    email: [ [Object] ],
    car: [ [Object] ],
    likesCheese: [ [Object] ],
    dietaryRestrictions: [ [Object] ]
  }
}
```

The script tries _create_ and _update_ and both fail because of a data type validation issue.

The first thing to do might be to run the same validation logic check on the given demo data, locally, and see what
fields do not comply and why.

My initial assumption is a bug because the data appears valid at first glance, but I don't know.
