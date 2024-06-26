import { TypeNode } from 'typescript';
import { LiteralValue, TypeKeyword } from '../TypeInfo';
import { checkType } from './checkType';

export const extractTypeDetails = (
  type: TypeNode
): {
  type: TypeKeyword;
  typeReference?: string;
  array: boolean;
  options?: LiteralValue[];
} => {
  const { isArray, typeReference, options, typeKeyword } = checkType(type);

  return {
    type: typeKeyword || 'string',
    typeReference,
    array: !!isArray,
    options,
  };
};
