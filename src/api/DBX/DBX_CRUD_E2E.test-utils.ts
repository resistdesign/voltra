import type { ListItemsResults } from "../../common/SearchTypes";
import { assertDbxPagingInvariants, assertDbxStableOrdering } from "./DBXAsserts";
import { runDbxRequest } from "./DBXRequest";
import { createDbxRuntime } from "./DBXRuntime";
import { DBX_TYPE_INFO_MAP } from "./DBXScenarioConfig";

type Author = {
  id: string;
  name: string;
  handle: string;
  role: "admin" | "editor" | "viewer";
};

type Post = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  score: number;
  createdAt: string;
  tags?: string[];
  authorId: string;
};

const buildDbxRuntime = () => {
  let authorCounter = 0;
  let postCounter = 0;

  return createDbxRuntime({
    typeInfoMap: DBX_TYPE_INFO_MAP,
    idGeneratorsByType: {
      Author: () => `author-${++authorCounter}`,
      Post: () => `post-${++postCounter}`,
    },
  });
};

const buildAuthors = (): Array<Omit<Author, "id">> => [
  { name: "Ada Lovelace", handle: "ada", role: "admin" },
  { name: "Grace Hopper", handle: "grace", role: "editor" },
];

const buildPosts = (authorIds: string[]): Array<Omit<Post, "id">> => [
  {
    title: "Alpha",
    body: "Hello Alpha",
    status: "draft",
    score: 10,
    createdAt: "2024-01-01T00:00:00.000Z",
    tags: ["alpha", "one"],
    authorId: authorIds[0],
  },
  {
    title: "Bravo",
    body: "Hello Bravo",
    status: "published",
    score: 20,
    createdAt: "2024-01-02T00:00:00.000Z",
    tags: ["bravo"],
    authorId: authorIds[0],
  },
  {
    title: "Charlie",
    body: "Hello Charlie",
    status: "published",
    score: 30,
    createdAt: "2024-01-03T00:00:00.000Z",
    tags: ["charlie", "two"],
    authorId: authorIds[1],
  },
  {
    title: "Delta",
    body: "Hello Delta",
    status: "archived",
    score: 40,
    createdAt: "2024-01-04T00:00:00.000Z",
    tags: ["delta", "three"],
    authorId: authorIds[1],
  },
  {
    title: "Echo",
    body: "Hello Echo",
    status: "draft",
    score: 50,
    createdAt: "2024-01-05T00:00:00.000Z",
    tags: ["echo", "four"],
    authorId: authorIds[0],
  },
];

/**
 * Run the DBX CRUD E2E scenario against the in-memory router/runtime.
 */
export const runDbxCrudScenario = async () => {
  const runtime = buildDbxRuntime();
  const authorIds: string[] = [];
  const postIds: string[] = [];

  for (const author of buildAuthors()) {
    const response = await runDbxRequest<string>(runtime, {
      method: "POST",
      path: "create",
      args: ["Author", author],
    });
    authorIds.push(response.parsedBody as string);
  }

  for (const post of buildPosts(authorIds)) {
    const response = await runDbxRequest<string>(runtime, {
      method: "POST",
      path: "create",
      args: ["Post", post],
    });
    postIds.push(response.parsedBody as string);
  }

  const readPostResponse = await runDbxRequest<Post>(runtime, {
    method: "POST",
    path: "read",
    args: ["Post", postIds[0]],
  });

  const updateResult = await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "update",
    args: [
      "Post",
      {
        id: postIds[1],
        title: "Bravo Updated",
        score: 22,
      },
    ],
  });

  const updatedPostResponse = await runDbxRequest<Post>(runtime, {
    method: "POST",
    path: "read",
    args: ["Post", postIds[1]],
  });

  const deleteResult = await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "delete",
    args: ["Post", postIds[2]],
  });

  const listConfig = {
    itemsPerPage: 2,
    sortFields: [{ field: "title" }],
  };

  const listPage1 = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: ["Post", listConfig],
  });
  const listPage2 = await runDbxRequest<ListItemsResults<Post>>(runtime, {
    method: "POST",
    path: "list",
    args: [
      "Post",
      {
        ...listConfig,
        cursor: listPage1.parsedBody?.cursor,
      },
    ],
  });

  const pages = [
    listPage1.parsedBody as ListItemsResults<Post>,
    listPage2.parsedBody as ListItemsResults<Post>,
  ];

  const listPageIds = pages.map((page) =>
    (page.items ?? []).map((item) => item.id),
  );
  const listCursors = pages.map((page) => page.cursor);
  const expectedOrder = [postIds[0], postIds[1], postIds[3], postIds[4]];

  return {
    createdAuthorIds: authorIds,
    createdPostIds: postIds,
    readPost: readPostResponse.parsedBody,
    updateResult: updateResult.parsedBody,
    updatedPost: updatedPostResponse.parsedBody,
    deleteResult: deleteResult.parsedBody,
    listPageIds,
    listCursors,
    paging: assertDbxPagingInvariants(pages, { itemsPerPage: 2 }),
    ordering: assertDbxStableOrdering(pages, expectedOrder),
  };
};
