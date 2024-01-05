export const NEVER_TYPE = 'never';

export const NAMESPACE_DELIMITERS = {
  INPUT_REGEX: /::/gim,
  INPUT: '::',
  OUTPUT: '.',
};

export const TAG_TYPE = 'Tag';

export const CONTAINER_TYPES = ['List', 'Map'];

export const PRIMITIVE_TYPE_MAP: Record<string, string> = {
  String: 'string',
  Integer: 'number',
  Boolean: 'boolean',
  Double: 'number',
  Json: 'Json',
  Timestamp: 'Timestamp',
  Long: 'number',
};
