import type { APIRoute } from 'astro';
import matter from 'gray-matter';
import { listFiles, getFiles } from '../../../lib/github';
import { TAGS_DIR } from '../../../lib/cms/content';

// Every tag a post can use (src/content/tags). New tags are created by the
// blog save, in the same commit as the post that first uses them.
export const GET: APIRoute = async () => {
  const files = (await listFiles(TAGS_DIR)).filter((f) => f.name.endsWith('.md'));
  const contents = await getFiles(files.map((f) => f.path));
  const tags = files
    .map((f, i) => {
      const data = contents[i] ? matter(contents[i]!.content).data : {};
      return { slug: f.name.replace(/\.md$/, ''), name: String(data.name || f.name.replace(/\.md$/, '')), description: data.description || '' };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return new Response(JSON.stringify(tags), { headers: { 'Content-Type': 'application/json' } });
};
