import type { ListItemsResults } from "../../common/SearchTypes";
import type { ItemRelationshipInfo } from "../../common/ItemRelationshipInfoTypes";
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
  authorId?: string;
};

type RelationshipDeleteResult = {
  success: boolean;
  remainingItemsExist: boolean;
};

type MissingRead = {
  id: string;
  statusCode: number;
  message?: string;
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
    body: "Rel Alpha",
    status: "draft",
    score: 10,
    createdAt: "2024-05-01T00:00:00.000Z",
    tags: ["alpha"],
    authorId: authorIds[0],
  },
  {
    title: "Beta",
    body: "Rel Beta",
    status: "published",
    score: 20,
    createdAt: "2024-05-02T00:00:00.000Z",
    tags: ["beta"],
    authorId: authorIds[0],
  },
  {
    title: "Gamma",
    body: "Rel Gamma",
    status: "published",
    score: 30,
    createdAt: "2024-05-03T00:00:00.000Z",
    tags: ["gamma"],
    authorId: authorIds[1],
  },
  {
    title: "Delta",
    body: "Rel Delta",
    status: "archived",
    score: 40,
    createdAt: "2024-05-04T00:00:00.000Z",
    tags: ["delta"],
    authorId: authorIds[1],
  },
];

const listRelationshipTargets = (
  results?: ListItemsResults<ItemRelationshipInfo>,
): string[] =>
  (results?.items ?? []).map((item) => item.toTypePrimaryFieldValue);

const requireOkParsedBody = <T>(response: {
  statusCode: number;
  parsedBody?: T;
}): T | undefined => {
  if (response.statusCode !== 200) {
    throw {
      statusCode: response.statusCode,
      parsedBody: response.parsedBody,
    };
  }

  return response.parsedBody;
};

const resolvePostTargets = async (
  runtime: ReturnType<typeof buildDbxRuntime>,
  ids: string[],
): Promise<{ resolvedIds: string[]; missingReads: MissingRead[] }> => {
  const resolvedIds: string[] = [];
  const missingReads: MissingRead[] = [];

  for (const id of ids) {
    const response = await runDbxRequest<Post>(runtime, {
      method: "POST",
      path: "read",
      args: ["Post", id],
    });

    if (response.statusCode === 200) {
      resolvedIds.push((response.parsedBody as Post)?.id ?? id);
    } else {
      const errorBody = response.parsedBody as { message?: string } | undefined;
      missingReads.push({
        id,
        statusCode: response.statusCode,
        message: errorBody?.message,
      });
    }
  }

  return { resolvedIds, missingReads };
};

/**
 * Run the DBX relationships E2E scenario against the in-memory router/runtime.
 */
export const runDbxRelationshipsScenario = async () => {
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

  const author1Posts = [postIds[0], postIds[1]];
  const author2Posts = [postIds[2]];
  const missingPostId = "post-missing";

  for (const postId of author1Posts) {
    await runDbxRequest<boolean>(runtime, {
      method: "POST",
      path: "create-relationship",
      args: [
        {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[0],
          toTypePrimaryFieldValue: postId,
        },
      ],
    });
  }

  for (const postId of author2Posts) {
    await runDbxRequest<boolean>(runtime, {
      method: "POST",
      path: "create-relationship",
      args: [
        {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[1],
          toTypePrimaryFieldValue: postId,
        },
      ],
    });
  }

  await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "create-relationship",
    args: [
      {
        fromTypeName: "Author",
        fromTypeFieldName: "posts",
        fromTypePrimaryFieldValue: authorIds[1],
        toTypePrimaryFieldValue: missingPostId,
      },
    ],
  });

  const postAuthorPairs: Array<[string, string]> = [
    [postIds[0], authorIds[0]],
    [postIds[1], authorIds[0]],
    [postIds[2], authorIds[1]],
    [postIds[3], authorIds[1]],
  ];

  for (const [postId, authorId] of postAuthorPairs) {
    await runDbxRequest<boolean>(runtime, {
      method: "POST",
      path: "create-relationship",
      args: [
        {
          fromTypeName: "Post",
          fromTypeFieldName: "author",
          fromTypePrimaryFieldValue: postId,
          toTypePrimaryFieldValue: authorId,
        },
      ],
    });
  }

  const relatedPostProjection: (keyof Post)[] = ["id", "title"];

  const author1RelatedPage1Response = await runDbxRequest<
    ListItemsResults<Post>
  >(runtime, {
    method: "POST",
    path: "list-related-items",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[0],
        },
        itemsPerPage: 1,
      },
      relatedPostProjection,
    ],
  });

  const author1RelatedPage1 = requireOkParsedBody(author1RelatedPage1Response);

  const author1RelatedPage2Response = await runDbxRequest<
    ListItemsResults<Post>
  >(runtime, {
    method: "POST",
    path: "list-related-items",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[0],
        },
        itemsPerPage: 1,
        cursor: author1RelatedPage1?.cursor,
      },
      relatedPostProjection,
    ],
  });

  const author1RelatedPage2 = requireOkParsedBody(author1RelatedPage2Response);
  const author1RelatedPage1Items = author1RelatedPage1?.items ?? [];
  const author1RelatedPage2Items = author1RelatedPage2?.items ?? [];
  const author1RelatedPage1Keys = author1RelatedPage1Items[0]
    ? Object.keys(author1RelatedPage1Items[0]).sort()
    : [];
  const author1RelatedPage2Keys = author1RelatedPage2Items[0]
    ? Object.keys(author1RelatedPage2Items[0]).sort()
    : [];

  const author1Page1 = await runDbxRequest<
    ListItemsResults<ItemRelationshipInfo>
  >(runtime, {
    method: "POST",
    path: "list-relationships",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[0],
        },
        itemsPerPage: 1,
      },
    ],
  });

  const author1Page2 = await runDbxRequest<
    ListItemsResults<ItemRelationshipInfo>
  >(runtime, {
    method: "POST",
    path: "list-relationships",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[0],
        },
        itemsPerPage: 1,
        cursor: author1Page1.parsedBody?.cursor,
      },
    ],
  });

  const author2List = await runDbxRequest<
    ListItemsResults<ItemRelationshipInfo>
  >(runtime, {
    method: "POST",
    path: "list-relationships",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[1],
        },
        itemsPerPage: 10,
      },
    ],
  });

  const author2Targets = listRelationshipTargets(author2List.parsedBody);
  const author2Resolved = await resolvePostTargets(runtime, author2Targets);

  const post1AuthorList = await runDbxRequest<
    ListItemsResults<ItemRelationshipInfo>
  >(runtime, {
    method: "POST",
    path: "list-relationships",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Post",
          fromTypeFieldName: "author",
          fromTypePrimaryFieldValue: postIds[0],
        },
        itemsPerPage: 10,
      },
    ],
  });

  const deleteAuthor1Post2 = await runDbxRequest<RelationshipDeleteResult>(
    runtime,
    {
      method: "POST",
      path: "delete-relationship",
      args: [
        {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[0],
          toTypePrimaryFieldValue: postIds[1],
        },
      ],
    },
  );

  const author1AfterDelete = await runDbxRequest<
    ListItemsResults<ItemRelationshipInfo>
  >(runtime, {
    method: "POST",
    path: "list-relationships",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[0],
        },
        itemsPerPage: 10,
      },
    ],
  });

  const deletePost3 = await runDbxRequest<boolean>(runtime, {
    method: "POST",
    path: "delete",
    args: ["Post", postIds[2]],
  });

  const author2AfterDelete = await runDbxRequest<
    ListItemsResults<ItemRelationshipInfo>
  >(runtime, {
    method: "POST",
    path: "list-relationships",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[1],
        },
        itemsPerPage: 10,
      },
    ],
  });

  const author2TargetsAfterDelete = listRelationshipTargets(
    author2AfterDelete.parsedBody,
  );
  const author2ResolvedAfterDelete = await resolvePostTargets(
    runtime,
    author2TargetsAfterDelete,
  );

  const deleteMissingRelation = await runDbxRequest<RelationshipDeleteResult>(
    runtime,
    {
      method: "POST",
      path: "delete-relationship",
      args: [
        {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[1],
          toTypePrimaryFieldValue: missingPostId,
        },
      ],
    },
  );

  const author2AfterPrune = await runDbxRequest<
    ListItemsResults<ItemRelationshipInfo>
  >(runtime, {
    method: "POST",
    path: "list-relationships",
    args: [
      {
        relationshipItemOrigin: {
          fromTypeName: "Author",
          fromTypeFieldName: "posts",
          fromTypePrimaryFieldValue: authorIds[1],
        },
        itemsPerPage: 10,
      },
    ],
  });

  return {
    createdAuthorIds: authorIds,
    createdPostIds: postIds,
    author1RelatedPage1Ids: author1RelatedPage1Items.map((item) => item.id),
    author1RelatedPage2Ids: author1RelatedPage2Items.map((item) => item.id),
    author1RelatedPage1Titles: author1RelatedPage1Items.map(
      (item) => item.title,
    ),
    author1RelatedPage2Titles: author1RelatedPage2Items.map(
      (item) => item.title,
    ),
    author1RelatedPage1Keys,
    author1RelatedPage2Keys,
    author1RelatedPage1CursorPresent: Boolean(author1RelatedPage1?.cursor),
    author1RelatedPage2CursorPresent: Boolean(author1RelatedPage2?.cursor),
    author1Page1Targets: listRelationshipTargets(author1Page1.parsedBody),
    author1Page2Targets: listRelationshipTargets(author1Page2.parsedBody),
    author2Targets,
    author2ResolvedIds: author2Resolved.resolvedIds,
    author2MissingReads: author2Resolved.missingReads,
    post1AuthorTargets: listRelationshipTargets(post1AuthorList.parsedBody),
    deleteAuthor1Post2Result: deleteAuthor1Post2.parsedBody,
    author1TargetsAfterDelete: listRelationshipTargets(
      author1AfterDelete.parsedBody,
    ),
    deletePost3Result: deletePost3.parsedBody,
    author2TargetsAfterDelete,
    author2ResolvedIdsAfterDelete: author2ResolvedAfterDelete.resolvedIds,
    author2MissingReadsAfterDelete: author2ResolvedAfterDelete.missingReads,
    deleteMissingRelationResult: deleteMissingRelation.parsedBody,
    author2TargetsAfterPrune: listRelationshipTargets(
      author2AfterPrune.parsedBody,
    ),
  };
};
