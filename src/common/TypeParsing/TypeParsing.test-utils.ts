import { getTypeInfoMapFromTypeScript } from "./TypeParsing";
import { TypeInfoMap } from "./TypeInfo";

export const runTypeParsingScenario = () => {
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

  const typeInfoMap: TypeInfoMap = getTypeInfoMapFromTypeScript(source);
  const book = typeInfoMap.Book;
  const picked = typeInfoMap.PickedBook;
  const omitted = typeInfoMap.OmittedBook;
  const mixed = typeInfoMap.Mixed;

  return {
    mapKeys: Object.keys(typeInfoMap).sort(),
    bookPrimaryField: book?.primaryField,
    bookFields: Object.keys(book?.fields || {}),
    bookTags: book?.tags || {},
    bookRatingOptions: book?.fields?.rating?.possibleValues || [],
    pickedFields: Object.keys(picked?.fields || {}),
    omittedFields: Object.keys(omitted?.fields || {}),
    mixedUnionFieldSets: mixed?.unionFieldSets || [],
    mixedFields: Object.keys(mixed?.fields || {}).sort(),
  };
};
