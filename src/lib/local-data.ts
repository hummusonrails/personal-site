import authors from '../data/authors.json';
import tags from '../data/tags.json';

export async function getAuthor(id = 'default') {
  return authors[id] || null;
}

export async function getTags(tagIds: string[] | string) {
    const normalized = Array.isArray(tagIds) ? tagIds : [tagIds];
    return normalized.map((id) => tags[id.toLowerCase()]).filter(Boolean);
}  
