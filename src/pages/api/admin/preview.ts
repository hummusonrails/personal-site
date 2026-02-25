import type { APIRoute } from 'astro';
import {
  createPreviewBranch,
  pushToPreviewBranch,
  getVercelPreviewUrl,
  deletePreviewBranch,
  deleteVercelDeployments,
  cleanupAllPreviews,
} from '../../../lib/github';
import matter from 'gray-matter';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { action, contentType, slug, frontmatter, content } = body;

  if (action === 'cleanup') {
    const { branchName } = body;
    if (branchName) {
      try {
        await deleteVercelDeployments(branchName);
        await deletePreviewBranch(branchName);
      } catch {
        // Branch/deployment may already be deleted
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'cleanup-all') {
    const result = await cleanupAllPreviews();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'status') {
    const { branchName } = body;
    if (!branchName) {
      return new Response(JSON.stringify({ error: 'Missing branchName' }), { status: 400 });
    }
    const previewUrl = await getVercelPreviewUrl(branchName);
    return new Response(
      JSON.stringify({ previewUrl, status: previewUrl ? 'ready' : 'building' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!contentType || !slug) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const branchName = `preview-${Date.now()}`;

  try {
    await createPreviewBranch(branchName);

    let filePath: string;
    let fileContent: string;

    if (contentType === 'blog') {
      filePath = `src/content/blog/${slug}.md`;
      const tags = (frontmatter.tags || ['posts']).map((t: string) => {
        if (typeof t === 'object') return t;
        return { slug: t, collection: 'tags' };
      });
      const fm = {
        title: frontmatter.title,
        date: frontmatter.date || new Date().toISOString().split('T')[0],
        tags,
        authors: frontmatter.authors || ['default'],
        ...(frontmatter.summary && { summary: frontmatter.summary }),
        ...(frontmatter.images && { images: frontmatter.images }),
        ...(frontmatter.canonicalUrl && { canonicalUrl: frontmatter.canonicalUrl }),
        draft: false, // Show in preview
      };
      fileContent = matter.stringify(content || '', fm);
    } else if (contentType === 'talk') {
      filePath = `src/content/talks/${slug}.md`;
      fileContent = matter.stringify('', {
        presentation: frontmatter.presentation,
        conference: frontmatter.conference,
        region: frontmatter.region,
        date: frontmatter.date,
        link: frontmatter.link,
        ...(frontmatter.image && { image: frontmatter.image }),
      });
    } else {
      await deletePreviewBranch(branchName);
      return new Response(JSON.stringify({ error: 'Invalid content type' }), { status: 400 });
    }

    await pushToPreviewBranch(branchName, filePath, fileContent, `Preview: ${slug}`);

    return new Response(
      JSON.stringify({
        ok: true,
        branchName,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    try {
      await deletePreviewBranch(branchName);
    } catch {
      // Cleanup on error
    }
    return new Response(
      JSON.stringify({ error: `Preview failed: ${(err as Error).message}` }),
      { status: 500 }
    );
  }
};
