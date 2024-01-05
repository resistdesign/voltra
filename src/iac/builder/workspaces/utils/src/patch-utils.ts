export type MergeStrategy = 'transpose' | 'accumulate' | 'accumulate-unique' | 'accumulate-unique-by' | 'replace';

export type MergeStrategyDescriptor =
  | {
      strategy: MergeStrategy;
    }
  | {
      strategy: 'accumulate-unique-by';
      data: string | ((value: any) => string);
    };

export type ValuePathString = string;

export type ValuePathArray = (string | number)[];

export type MergeStrategyMap = Record<ValuePathString, MergeStrategyDescriptor>;

export const DEFAULT_MERGE_STRATEGY: MergeStrategy = 'transpose';

export const getValuePathString = (valuePathArray: ValuePathArray = []): string => valuePathArray.map((p) => encodeURIComponent(p)).join('/');

export const getValuePathArray = (valuePathString: ValuePathString = ''): string[] => valuePathString.split('/').map((p) => decodeURIComponent(p));

export const isConstructedFrom = (value: any, constructorReference: Function): boolean =>
  value !== null && typeof value === 'object' && 'constructor' in value && value.constructor === constructorReference;

export const mergeValues = (valuePathArray: ValuePathArray = [], existingValue: any, newValue: any, mergeStrategyMap: MergeStrategyMap = {}): any => {
  const valuePathString = getValuePathString(valuePathArray);
  const arrayIndexWildcardValuePathString = getValuePathString(valuePathArray.map((p) => (typeof p === 'number' ? '#' : p)));
  const {
    [valuePathString]: { strategy: specificKeyMergeStrategy = DEFAULT_MERGE_STRATEGY, data: specificKeyMergeStrategyData = undefined } = {} as any,
    [arrayIndexWildcardValuePathString]: {
      strategy: arrayIndexWildcardMergeStrategy = DEFAULT_MERGE_STRATEGY,
      data: arrayIndexWildcardMergeStrategyData = undefined,
    } = {} as any,
  } = mergeStrategyMap;
  const mergeStrategy = valuePathString in mergeStrategyMap ? specificKeyMergeStrategy : arrayIndexWildcardMergeStrategy;
  const mergeStrategyData = valuePathString in mergeStrategyMap ? specificKeyMergeStrategyData : arrayIndexWildcardMergeStrategyData;

  let mergedValue: any = typeof newValue !== 'undefined' ? newValue : existingValue;
  if (mergeStrategy !== 'replace') {
    if (isConstructedFrom(existingValue, Array) && isConstructedFrom(newValue, Array)) {
      if (mergeStrategy === 'accumulate') {
        mergedValue = [...existingValue, ...newValue];
      } else if (mergeStrategy === 'accumulate-unique') {
        mergedValue = [...existingValue, ...newValue.filter((item: any) => existingValue.indexOf(item) === -1)];
      } else if (mergeStrategy === 'accumulate-unique-by') {
        const existingItemMap: Record<string, any> = {};
        const newItemMap: Record<string, any> = {};

        for (let i = 0; i < existingValue.length; i++) {
          const existingItem = existingValue[i];

          if (existingItem && typeof existingItem === 'object') {
            const identifier = mergeStrategyData instanceof Function ? mergeStrategyData(existingItem) : existingItem[mergeStrategyData as string];

            existingItemMap[identifier as string] = existingItem;
          }
        }

        for (let j = 0; j < newValue.length; j++) {
          const newItem = newValue[j];

          if (newItem && typeof newItem === 'object') {
            const identifier = mergeStrategyData instanceof Function ? mergeStrategyData(newItem) : newItem[mergeStrategyData as string];

            newItemMap[identifier as string] = newItem;
          }
        }

        mergedValue = Object.keys({
          ...existingItemMap,
          ...newItemMap,
        }).map((id, index) => mergeValues([...valuePathArray, index], existingItemMap[id], newItemMap[id], mergeStrategyMap));
      } else if (mergeStrategy === 'transpose') {
        const fullLength = Math.max(existingValue.length, newValue.length);

        mergedValue = [...new Array(fullLength)].map((_empty, index) =>
          mergeValues([...valuePathArray, index], existingValue[index], newValue[index], mergeStrategyMap)
        );
      }
    } else if (isConstructedFrom(existingValue, Object) && isConstructedFrom(newValue, Object)) {
      mergedValue = Object.keys({ ...existingValue, ...newValue }).reduce(
        (acc, k) => ({
          ...acc,
          [k]: mergeValues([...valuePathArray, k], existingValue[k], newValue[k], mergeStrategyMap),
        }),
        {}
      );
    }
  }

  return mergedValue;
};
