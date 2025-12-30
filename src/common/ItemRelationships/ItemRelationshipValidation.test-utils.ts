import {
  TYPE_INFO_ORM_RELATIONSHIP_ERRORS,
  validateRelationshipItem,
} from "./ItemRelationshipValidation";
import { ItemRelationshipInfoKeys } from "../ItemRelationshipInfoTypes";

export const runItemRelationshipValidationScenario = () => {
  const baseItem = {
    [ItemRelationshipInfoKeys.fromTypeName]: "Book",
    [ItemRelationshipInfoKeys.fromTypeFieldName]: "author",
    [ItemRelationshipInfoKeys.fromTypePrimaryFieldValue]: "book-1",
    [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: "person-1",
  };

  const validResult = validateRelationshipItem(baseItem);
  const missingFieldResult = validateRelationshipItem({
    ...baseItem,
    [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: "",
  });
  const omittedFieldResult = validateRelationshipItem(
    {
      ...baseItem,
      [ItemRelationshipInfoKeys.toTypePrimaryFieldValue]: "",
    },
    [ItemRelationshipInfoKeys.toTypePrimaryFieldValue],
  );

  return {
    validResult,
    missingFieldResult,
    omittedFieldResult,
    expectedErrors: TYPE_INFO_ORM_RELATIONSHIP_ERRORS,
  };
};
