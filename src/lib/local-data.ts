import { getEntry } from "astro:content";

export async function getAuthor(id: string = "default") {
  const author = await getEntry("authors", id);
  return author?.data ? { slug: author.slug, ...author.data } : null;
}

export async function getTags(tagIds: (string | { slug: string })[] | string) {
  const normalized = Array.isArray(tagIds) ? tagIds : [tagIds];

  const tagPromises = normalized.map((id) => {
    const slug = typeof id === "string" ? id.toLowerCase() : id.slug?.toLowerCase();
    return slug ? getEntry("tags", slug) : null;
  });

  const resolved = await Promise.all(tagPromises);
  return resolved.filter(Boolean);
}
