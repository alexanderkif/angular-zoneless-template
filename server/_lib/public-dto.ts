export type PublicAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type AuthorLike = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type WithAuthor = {
  author: AuthorLike;
};

export const toPublicAuthor = (author: AuthorLike): PublicAuthor => ({
  id: author.id,
  name: author.name,
  avatarUrl: author.avatarUrl,
});

export const toPublicEntityWithAuthor = <T extends WithAuthor>(
  entity: T,
): Omit<T, 'author'> & { author: PublicAuthor } => ({
  ...entity,
  author: toPublicAuthor(entity.author),
});

export const toPublicEntityListWithAuthor = <T extends WithAuthor>(
  entities: T[],
): Array<Omit<T, 'author'> & { author: PublicAuthor }> =>
  entities.map((entity) => toPublicEntityWithAuthor(entity));
