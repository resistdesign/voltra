import { TypeInfoValidationResults } from "../TypeParsing/Validation";
import {
  ItemRelationshipInfoKeys,
  ItemRelationshipInfoType,
} from "../ItemRelationshipInfoTypes";

export const TYPE_INFO_ORM_RELATIONSHIP_ERRORS = {
  INVALID_RELATIONSHIP_ITEM: "INVALID_RELATIONSHIP_ITEM",
  INVALID_RELATIONSHIP_ITEM_FIELD: "INVALID_RELATIONSHIP_ITEM_FIELD",
};

/**
 * Validates a relationship item.
 * */
export const validateRelationshipItem = (
  relationshipItem: ItemRelationshipInfoType,
  omitFields: ItemRelationshipInfoKeys[] = [],
): TypeInfoValidationResults => {
  const results: TypeInfoValidationResults = {
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
