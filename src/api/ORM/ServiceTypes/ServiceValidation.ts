import {
  DBRelationshipItemKeys,
  DBRelationshipItemType,
} from "./DBServiceTypes";
import { TypeInfoValidationResults } from "../../../common/TypeParsing/Validation";

export const TYPE_INFO_ORM_RELATIONSHIP_ERRORS = {
  INVALID_RELATIONSHIP_ITEM: "INVALID_RELATIONSHIP_ITEM",
  INVALID_RELATIONSHIP_ITEM_FIELD: "INVALID_RELATIONSHIP_ITEM_FIELD",
};

/**
 * Validates a relationship item.
 * */
export const validateRelationshipItem = (
  relationshipItem: DBRelationshipItemType,
  omitFields: DBRelationshipItemKeys[] = [],
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
    valid: true,
    error: "",
    errorMap: {},
  };

  if (typeof relationshipItem === "object" && relationshipItem !== null) {
    const relKeyValues = Object.values(DBRelationshipItemKeys);

    for (const rKV of relKeyValues) {
      const universalRKV = rKV as keyof DBRelationshipItemType;
      const omitRKV = omitFields.includes(rKV);

      if (
        !omitRKV &&
        (typeof relationshipItem[universalRKV] !== "string" ||
          !relationshipItem[universalRKV])
      ) {
        results.valid = false;
        results.error =
          TYPE_INFO_ORM_RELATIONSHIP_ERRORS.INVALID_RELATIONSHIP_ITEM;
        results.errorMap[rKV] = [
          TYPE_INFO_ORM_RELATIONSHIP_ERRORS.INVALID_RELATIONSHIP_ITEM_FIELD,
        ];
      }
    }
  } else {
    results.valid = false;
    results.error = TYPE_INFO_ORM_RELATIONSHIP_ERRORS.INVALID_RELATIONSHIP_ITEM;
  }

  return results;
};
