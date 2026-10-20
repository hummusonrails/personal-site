import type { APIRoute } from 'astro';
import {
  createPreviewBranch,
  pushToPreviewBranch,
  getVercelPreviewUrl,
  deletePreviewBranch,
  deleteVercelDeployments,
  cleanupAllPreviews,
} from '../../../lib/github';
import { BLOG_DIR, TAGS_DIR, blogFile, tagFile, validSlug } from '../../../lib/cms/content';

// Full-site previews of a blog post: the post is pushed to a throwaway
// preview-<timestamp> branch, Vercel builds it, and the branch and its
// deployments are deleted afterwards.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
// Only branches this endpoint created can be inspected or deleted through it.
const PREVIEW_BRANCH = /^preview-\d+$/;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { action, slug, frontmatter, content } = body;

  if (action === 'cleanup' || action === 'status') {
    const { branchName } = body;
    if (typeof branchName !== 'string' || !PREVIEW_BRANCH.test(branchName)) return json({ error: 'Bad branch' }, 400);
    if (action === 'status') {
      const previewUrl = await getVercelPreviewUrl(branchName);
      return json({ previewUrl, status: previewUrl ? 'ready' : 'building' });
    }
    try {
      await deleteVercelDeployments(branchName);
      await deletePreviewBranch(branchName);
    } catch {
      // Branch/deployment may already be deleted
    }
    return json({ ok: true });
  }

  if (action === 'cleanup-all') return json({ ok: true, ...(await cleanupAllPreviews()) });

  if (!validSlug(slug) || !frontmatter?.title) return json({ error: 'Title and a valid slug are required.' }, 400);

  const branchName = `preview-${Date.now()}`;
  try {
    await createPreviewBranch(branchName);
    // New tags must exist on the branch too, or the preview build fails.
    for (const t of body.newTags || []) {
      if (validSlug(t.slug) && (frontmatter.tags || []).includes(t.slug)) {
        await pushToPreviewBranch(branchName, `${TAGS_DIR}/${t.slug}.md`, tagFile(t.name || t.slug), `Preview tag: ${t.slug}`);
      }
    }
    await pushToPreviewBranch(
      branchName,
      `${BLOG_DIR}/${slug}.md`,
      blogFile({ ...frontmatter, draft: false }, String(content || '')),
      `Preview: ${slug}`,
    );
    return json({ ok: true, branchName });
  } catch (err) {
    try {
      await deletePreviewBranch(branchName);
    } catch {
      // Cleanup on error
    }
    return json({ error: `Preview failed: ${(err as Error).message}` }, 500);
  }
};
