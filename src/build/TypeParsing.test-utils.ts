import { getTypeInfoMapFromTypeScript } from "./TypeParsing";
import { TypeInfoMap } from "../common/TypeParsing/TypeInfo";

const getTypeInfoMapScenario = () => {
  const source = `
    /** @label Book @persisted true */
    export type Book = {
      /** @primaryField */
      id: string;
      title: string;
      rating: 1 | 2;
      tags?: string[];
      author: Person;
    };

    export type Person = {
      name: string;
    };

    export type PickedBook = Pick<Book, "id" | "rating">;
    export type OmittedBook = Omit<Book, "tags">;
    export type ExcludedBook = Exclude<Book, Person>;
    export type Mixed = Book | Person;
    type Hidden = { secret: string };
  `;

  return getTypeInfoMapFromTypeScript(source) as TypeInfoMap;
};

export const runTypeParsingMapKeysScenario = () => {
  const typeInfoMap = getTypeInfoMapScenario();
  return Object.keys(typeInfoMap).sort();
};

export const runTypeParsingBookMetadataScenario = () => {
  const typeInfoMap = getTypeInfoMapScenario();
  const book = typeInfoMap.Book;
  return {
    bookPrimaryField: book?.primaryField,
    bookFields: Object.keys(book?.fields || {}),
    bookTags: book?.tags || {},
    bookRatingOptions: book?.fields?.rating?.possibleValues || [],
  };
};

export const runTypeParsingPickedBookScenario = () => {
  const typeInfoMap = getTypeInfoMapScenario();
  const picked = typeInfoMap.PickedBook;
  return Object.keys(picked?.fields || {});
};

export const runTypeParsingOmittedBookScenario = () => {
  const typeInfoMap = getTypeInfoMapScenario();
  const omitted = typeInfoMap.OmittedBook;
  return Object.keys(omitted?.fields || {});
};

export const runTypeParsingMixedUnionScenario = () => {
  const typeInfoMap = getTypeInfoMapScenario();
  const mixed = typeInfoMap.Mixed;
  return {
    mixedUnionFieldSets: mixed?.unionFieldSets || [],
    mixedFields: Object.keys(mixed?.fields || {}).sort(),
  };
};
