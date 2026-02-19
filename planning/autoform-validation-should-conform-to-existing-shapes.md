# AutoForm Validation Should Conform To Existing Shapes

1. `src/app/forms/Engine.ts` `validate` *should* return a `TypeInfoValidationResult` object.
2. `TypeInfoValidationResult` `error` and `errorMap` fields should be changed to look like this:
   ```typescript
   /**
    * A descriptor for an error.
    */
   export type ErrorDescriptor = {
     code: valueof ERROR_MESSAGE_CONSTANTS; // Pseudo code. Needs to use values from ERROR_MESSAGE_CONSTANTS.
     values?: string[]; // Used for things like min/max targets or other constraints that should have been met. 
   };
   
   /**
    * A map of errors.
    * */
   export type ErrorMap = {
     [key: string]: ErrorDescriptor[];
   };
   
   /**
    * The validation results for type info fields.
    */
   export type TypeInfoValidationResults = {
     /**
      * Type name being validated.
      */
     typeName: string | null;
     /**
      * Whether the validation passed.
      */
     valid: boolean;
     /**
      * Primary error code when validation fails.
      */
     error: ErrorDescriptor;
     /**
      * Field-level error mapping.
      */
     errorMap: ErrorMap;
   };
   ```
3. All validation consumers should be updated to use the new return type.
4. AutoForm should take a prop called `translateValidationErrorCode` that it can use to pass
   user-friendly/application-specific error messages to the internal error message rendering mechanisms and renderers.
5. `ERROR_MESSAGE_CONSTANTS` should have whatever codes added that it needs, like constraint related codes and such.
   `ERROR_MESSAGE_CONSTANTS` may need to be `as const` or an enum.
6. All tests/doc-comments/consuming-code/readmes/examples/demos/samples/etc should be updated to reflect all of these
   changes.

IMPORTANT: Be thorough. Code cleanly. Understand the spirit of this refactor and the uniformity and flexibility it
intends to bring. Investigate first. Understand the project.