/**
 * Validation helpers for relationship items.
 */
import type { TypeInfoValidationResults } from "../TypeParsing/Validation";
import {
  ItemRelationshipInfoKeys,
  ItemRelationshipInfoType,
} from "../ItemRelationshipInfoTypes";

/**
 * Error codes for relationship validation.
 * */
export const TYPE_INFO_ORM_RELATIONSHIP_ERRORS = {
  INVALID_RELATIONSHIP_ITEM: "INVALID_RELATIONSHIP_ITEM",
  INVALID_RELATIONSHIP_ITEM_FIELD: "INVALID_RELATIONSHIP_ITEM_FIELD",
  MISSING_RELATIONSHIP_ITEM_FIELD: "MISSING_RELATIONSHIP_ITEM_FIELD",
};

/**
 * Validates a relationship item.
 *
 * @param relationshipItem - Relationship item to validate.
 * @param omitFields - Relationship keys to ignore during validation.
 * @returns Validation results with errors and errorMap when invalid.
 * */
export const validateRelationshipItem = (
  relationshipItem: ItemRelationshipInfoType,
  omitFields: ItemRelationshipInfoKeys[],
): TypeInfoValidationResults => {
  const { fromTypeName } = relationshipItem;
  const results: TypeInfoValidationResults = {
    typeName: fromTypeName,
    valid: true,
    error: "",
    errorMap: {},
  };

  if (typeof relationshipItem === "object" && relationshipItem !== null) {
    const relKeyValues = Object.values(ItemRelationshipInfoKeys);

    for (const rKV of relKeyValues) {
      const universalRKV = rKV as keyof ItemRelationshipInfoType;
      const omitRKV = omitFields.includes(rKV);

      if (
        // Invalid Field Value
        (universalRKV in relationshipItem &&
          typeof relationshipItem[universalRKV] !== "string") ||
        (omitRKV && universalRKV in relationshipItem)
      ) {
        results.valid = false;
        results.error =
          TYPE_INFO_ORM_RELATIONSHIP_ERRORS.INVALID_RELATIONSHIP_ITEM;
        results.errorMap[rKV] = [
          TYPE_INFO_ORM_RELATIONSHIP_ERRORS.INVALID_RELATIONSHIP_ITEM_FIELD,
        ];
      } else if (
        // Missing Field
        !omitRKV &&
        (!(universalRKV in relationshipItem) || !relationshipItem[universalRKV])
      ) {
        results.valid = false;
        results.error =
          TYPE_INFO_ORM_RELATIONSHIP_ERRORS.INVALID_RELATIONSHIP_ITEM;
        results.errorMap[rKV] = [
          TYPE_INFO_ORM_RELATIONSHIP_ERRORS.MISSING_RELATIONSHIP_ITEM_FIELD,
        ];
      }
    }
  } else {
    results.valid = false;
    results.error = TYPE_INFO_ORM_RELATIONSHIP_ERRORS.INVALID_RELATIONSHIP_ITEM;
  }

  return results;
};
