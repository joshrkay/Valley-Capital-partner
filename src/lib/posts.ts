import { getCollection, type CollectionEntry } from 'astro:content';

// Published posts, newest first. Drafts are included while writing (`npm run dev`) and never in a production build.
export async function getPublishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getCollection('blog', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.data.title.localeCompare(b.data.title));
}
