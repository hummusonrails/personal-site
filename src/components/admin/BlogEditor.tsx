import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TurndownService from 'turndown';

const AVAILABLE_TAGS = [
  'ai', 'blockchain', 'career', 'couchbase', 'devrel', 'docker', 'elixir',
  'expressjs', 'github', 'monitoring', 'nodejs', 'openai', 'posts',
  'productivity', 'ruby', 'rust', 'showcase', 'tutorial', 'twilio',
];

interface BlogEditorProps {
  mode: 'new' | 'edit';
  slug?: string;
  initialData?: {
    frontmatter: Record<string, any>;
    content: string;
    sha: string;
  };
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

turndown.addRule('pre-code', {
  filter: (node) => node.nodeName === 'PRE' && node.querySelector('code') !== null,
  replacement: (_content, node) => {
    const code = (node as HTMLElement).querySelector('code');
    if (!code) return _content;
    const lang = code.className?.replace('language-', '') || '';
    return `\n\`\`\`${lang}\n${code.textContent}\n\`\`\`\n`;
  },
});

export default function BlogEditor({ mode, slug: initialSlug, initialData }: BlogEditorProps) {
  const [title, setTitle] = useState(initialData?.frontmatter?.title || '');
  const [slug, setSlug] = useState(initialSlug || '');
  const [date, setDate] = useState(
    initialData?.frontmatter?.date
      ? new Date(initialData.frontmatter.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState(initialData?.frontmatter?.summary || '');
  const [images, setImages] = useState(initialData?.frontmatter?.images || '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialData?.frontmatter?.canonicalUrl || '');
  const [draft, setDraft] = useState(initialData?.frontmatter?.draft ?? false);
  const [tags, setTags] = useState<string[]>(() => {
    const t = initialData?.frontmatter?.tags || ['posts'];
    return t.map((tag: any) => (typeof tag === 'object' ? tag.slug : tag));
  });
  const [sha, setSha] = useState(initialData?.sha || '');
  const [editorMode, setEditorMode] = useState<'rich' | 'markdown'>('rich');
  const [markdownContent, setMarkdownContent] = useState(initialData?.content || '');
  const [saving, setSaving] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSlugRef = useRef(mode === 'new');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: 'code-block' } },
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: 'Start writing your post...' }),
      Underline,
    ],
    content: initialData?.content ? markdownToHtml(initialData.content) : '',
    editorProps: {
      attributes: {
        class: 'cms-editor-content',
      },
    },
  });

  function markdownToHtml(md: string): string {
    // Simple markdown to HTML conversion for the editor
    let html = md
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Handle code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

    // Handle lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Handle paragraphs
    html = html.split('\n\n').map(block => {
      if (block.startsWith('<')) return block;
      if (block.trim() === '') return '';
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    }).join('\n');

    return html;
  }

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (autoSlugRef.current) {
      setSlug(generateSlug(value));
    }
  }, []);

  const handleSlugChange = useCallback((value: string) => {
    autoSlugRef.current = false;
    setSlug(value);
  }, []);

  const addTag = useCallback((tag: string) => {
    if (!tags.includes(tag)) setTags([...tags, tag]);
  }, [tags]);

  const removeTag = useCallback((tag: string) => {
    setTags(tags.filter(t => t !== tag));
  }, [tags]);

  const getContent = useCallback((): string => {
    if (editorMode === 'markdown') return markdownContent;
    if (!editor) return markdownContent;
    const html = editor.getHTML();
    return turndown.turndown(html);
  }, [editor, editorMode, markdownContent]);

  const switchToMarkdown = useCallback(() => {
    if (editor) {
      const html = editor.getHTML();
      setMarkdownContent(turndown.turndown(html));
    }
    setEditorMode('markdown');
  }, [editor]);

  const switchToRich = useCallback(() => {
    if (markdownContent) {
      editor?.commands.setContent(markdownToHtml(markdownContent));
    }
    setEditorMode('rich');
  }, [editor, markdownContent]);

  const handleSave = useCallback(async (asDraft?: boolean) => {
    if (!title || !slug) {
      (window as any).showToast('Title and slug are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const content = getContent();
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          frontmatter: {
            title,
            date,
            summary,
            images: images || undefined,
            canonicalUrl: canonicalUrl || undefined,
            draft: asDraft ?? draft,
            tags,
            authors: ['default'],
          },
          content,
          sha: sha || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSha(data.sha);
        (window as any).showToast(mode === 'new' ? 'Post created!' : 'Post updated!', 'success');
        if (mode === 'new') {
          window.history.replaceState({}, '', `/admin/blog/${slug}`);
        }
      } else {
        (window as any).showToast(data.error || 'Save failed', 'error');
      }
    } catch (err) {
      (window as any).showToast('Save failed', 'error');
    }
    setSaving(false);
  }, [title, slug, date, summary, images, canonicalUrl, draft, tags, sha, mode, getContent]);

  const handleImportUrl = useCallback(async () => {
    if (!importUrl) return;
    setImporting(true);
    try {
      const res = await fetch('/api/admin/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.title) handleTitleChange(data.title);
        if (data.summary) setSummary(data.summary);
        if (data.image) setImages(data.image);
        if (data.canonicalUrl) setCanonicalUrl(data.canonicalUrl);
        if (data.content) {
          setMarkdownContent(data.content);
          editor?.commands.setContent(markdownToHtml(data.content));
        }
        (window as any).showToast('Content imported successfully!', 'success');
      } else {
        (window as any).showToast(data.error || 'Import failed', 'error');
      }
    } catch {
      (window as any).showToast('Import failed', 'error');
    }
    setImporting(false);
  }, [importUrl, editor, handleTitleChange]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      // Parse frontmatter if present
      const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (fmMatch) {
        const fmText = fmMatch[1];
        const body = fmMatch[2];

        // Simple YAML parsing
        const lines = fmText.split('\n');
        for (const line of lines) {
          const [key, ...rest] = line.split(':');
          const value = rest.join(':').trim().replace(/^['"]|['"]$/g, '');
          if (key.trim() === 'title' && value) handleTitleChange(value);
          if (key.trim() === 'summary' && value) setSummary(value);
          if (key.trim() === 'date' && value) setDate(value);
          if (key.trim() === 'images' && value) setImages(value);
          if (key.trim() === 'canonicalUrl' && value) setCanonicalUrl(value);
        }

        setMarkdownContent(body.trim());
        editor?.commands.setContent(markdownToHtml(body.trim()));
      } else {
        setMarkdownContent(text);
        editor?.commands.setContent(markdownToHtml(text));
      }

      (window as any).showToast('Markdown file loaded!', 'success');
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [editor, handleTitleChange]);

  const handlePreview = useCallback(async () => {
    if (!title || !slug) {
      (window as any).showToast('Title and slug are required for preview', 'error');
      return;
    }
    setPreviewing(true);
    try {
      const content = getContent();
      const res = await fetch('/api/admin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'blog',
          slug,
          frontmatter: {
            title,
            date,
            summary,
            images: images || undefined,
            canonicalUrl: canonicalUrl || undefined,
            tags,
            authors: ['default'],
          },
          content,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.previewUrl) {
          window.open(data.previewUrl, '_blank');
          (window as any).showToast('Preview deployment ready!', 'success');
        } else {
          (window as any).showToast(data.message || 'Preview branch created. Check Vercel for the deployment URL.', 'info');
        }
      } else {
        (window as any).showToast(data.error || 'Preview failed', 'error');
      }
    } catch {
      (window as any).showToast('Preview failed', 'error');
    }
    setPreviewing(false);
  }, [title, slug, date, summary, images, canonicalUrl, tags, getContent]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Metadata Section */}
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="cms-form-group" style={{ margin: 0 }}>
            <label className="cms-label">Title</label>
            <input
              className="cms-input"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Your post title"
            />
          </div>

          <div className="cms-form-row">
            <div className="cms-form-group" style={{ margin: 0 }}>
              <label className="cms-label">Slug</label>
              <input
                className="cms-input"
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="url-friendly-slug"
                style={{ fontFamily: 'var(--cms-font-mono)', fontSize: 13 }}
              />
            </div>
            <div className="cms-form-group" style={{ margin: 0 }}>
              <label className="cms-label">Date</label>
              <input
                className="cms-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="cms-form-group" style={{ margin: 0 }}>
            <label className="cms-label">Summary</label>
            <input
              className="cms-input"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief description of the post"
            />
          </div>

          <div className="cms-form-row">
            <div className="cms-form-group" style={{ margin: 0 }}>
              <label className="cms-label">Cover Image URL</label>
              <input
                className="cms-input"
                type="text"
                value={images}
                onChange={(e) => setImages(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="cms-form-group" style={{ margin: 0 }}>
              <label className="cms-label">Canonical URL</label>
              <input
                className="cms-input"
                type="text"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="https://original-source.com/post"
              />
            </div>
          </div>

          <div className="cms-form-group" style={{ margin: 0 }}>
            <label className="cms-label">Tags</label>
            <div className="cms-tag-pills">
              {tags.map((tag) => (
                <span key={tag} className="cms-tag-pill">
                  {tag}
                  <button onClick={() => removeTag(tag)} type="button">&times;</button>
                </span>
              ))}
            </div>
            <select
              className="cms-select"
              style={{ marginTop: 8 }}
              onChange={(e) => { if (e.target.value) { addTag(e.target.value); e.target.value = ''; } }}
              defaultValue=""
            >
              <option value="" disabled>Add a tag...</option>
              {AVAILABLE_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="cms-checkbox-row">
            <input
              className="cms-checkbox"
              type="checkbox"
              id="draft-toggle"
              checked={draft}
              onChange={(e) => setDraft(e.target.checked)}
            />
            <label htmlFor="draft-toggle" className="cms-label" style={{ margin: 0 }}>Save as draft</label>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="cms-card" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="cms-input"
          type="url"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          placeholder="Paste a URL to import content..."
          style={{ flex: 1, minWidth: 200 }}
        />
        <button
          className="cms-btn cms-btn-secondary"
          onClick={handleImportUrl}
          disabled={importing || !importUrl}
          type="button"
        >
          {importing ? (
            <><span className="cms-spinner" style={{ width: 14, height: 14 }}></span> Importing...</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Import URL
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.mdx,.markdown"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          className="cms-btn cms-btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload .md
        </button>
      </div>

      {/* Editor Section */}
      <div className="cms-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Editor tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--cms-border)',
          background: 'var(--cms-surface)',
        }}>
          <button
            type="button"
            onClick={switchToRich}
            style={{
              padding: '10px 20px',
              background: editorMode === 'rich' ? 'var(--cms-card)' : 'transparent',
              border: 'none',
              borderBottom: editorMode === 'rich' ? '2px solid var(--cms-primary)' : '2px solid transparent',
              color: editorMode === 'rich' ? 'var(--cms-text)' : 'var(--cms-text-muted)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--cms-font)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Rich Text
          </button>
          <button
            type="button"
            onClick={switchToMarkdown}
            style={{
              padding: '10px 20px',
              background: editorMode === 'markdown' ? 'var(--cms-card)' : 'transparent',
              border: 'none',
              borderBottom: editorMode === 'markdown' ? '2px solid var(--cms-primary)' : '2px solid transparent',
              color: editorMode === 'markdown' ? 'var(--cms-text)' : 'var(--cms-text-muted)',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--cms-font)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Markdown
          </button>
        </div>

        {/* Rich text toolbar */}
        {editorMode === 'rich' && editor && (
          <div style={{
            display: 'flex',
            gap: 2,
            padding: '8px 12px',
            borderBottom: '1px solid var(--cms-border)',
            flexWrap: 'wrap',
          }}>
            <ToolbarButton
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >B</ToolbarButton>
            <ToolbarButton
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
              style={{ fontStyle: 'italic' }}
            >I</ToolbarButton>
            <ToolbarButton
              active={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline"
              style={{ textDecoration: 'underline' }}
            >U</ToolbarButton>
            <ToolbarButton
              active={editor.isActive('strike')}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
              style={{ textDecoration: 'line-through' }}
            >S</ToolbarButton>

            <div style={{ width: 1, background: 'var(--cms-border)', margin: '0 6px' }} />

            <ToolbarButton
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
            >H2</ToolbarButton>
            <ToolbarButton
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
            >H3</ToolbarButton>

            <div style={{ width: 1, background: 'var(--cms-border)', margin: '0 6px' }} />

            <ToolbarButton
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Ordered List"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" fill="currentColor" fontSize="8" fontWeight="bold">1</text><text x="2" y="14" fill="currentColor" fontSize="8" fontWeight="bold">2</text><text x="2" y="20" fill="currentColor" fontSize="8" fontWeight="bold">3</text></svg>
            </ToolbarButton>

            <div style={{ width: 1, background: 'var(--cms-border)', margin: '0 6px' }} />

            <ToolbarButton
              active={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Blockquote"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('codeBlock')}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              title="Code Block"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Inline Code"
            >{'{}'}</ToolbarButton>

            <div style={{ width: 1, background: 'var(--cms-border)', margin: '0 6px' }} />

            <ToolbarButton
              active={editor.isActive('link')}
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              title="Link"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </ToolbarButton>
            <ToolbarButton
              active={false}
              onClick={() => {
                const url = prompt('Enter image URL:');
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }}
              title="Image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </ToolbarButton>

            <div style={{ width: 1, background: 'var(--cms-border)', margin: '0 6px' }} />

            <ToolbarButton
              active={false}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >&#8213;</ToolbarButton>
          </div>
        )}

        {/* Editor area */}
        <div style={{ minHeight: 400 }}>
          {editorMode === 'rich' ? (
            <EditorContent editor={editor} />
          ) : (
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: 400,
                background: 'var(--cms-bg)',
                border: 'none',
                color: 'var(--cms-text)',
                fontFamily: 'var(--cms-font-mono)',
                fontSize: 13,
                lineHeight: 1.7,
                padding: 20,
                resize: 'vertical',
                outline: 'none',
              }}
              placeholder="Write your markdown here..."
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'flex-end',
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--cms-border)',
      }}>
        <button
          className="cms-btn cms-btn-secondary"
          onClick={handlePreview}
          disabled={previewing}
          type="button"
        >
          {previewing ? (
            <><span className="cms-spinner" style={{ width: 14, height: 14 }}></span> Deploying preview...</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview
            </>
          )}
        </button>
        <button
          className="cms-btn cms-btn-secondary"
          onClick={() => handleSave(true)}
          disabled={saving}
          type="button"
        >
          Save as Draft
        </button>
        <button
          className="cms-btn cms-btn-primary"
          onClick={() => handleSave(false)}
          disabled={saving}
          type="button"
        >
          {saving ? (
            <><span className="cms-spinner" style={{ width: 14, height: 14, borderTopColor: 'white' }}></span> Saving...</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {mode === 'new' ? 'Publish' : 'Update'}
            </>
          )}
        </button>
      </div>

      <style>{`
        .cms-editor-content {
          min-height: 400px;
          padding: 20px;
          outline: none;
          font-size: 15px;
          line-height: 1.7;
          color: var(--cms-text);
        }
        .cms-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--cms-text-muted);
          pointer-events: none;
          float: left;
          height: 0;
        }
        .cms-editor-content h2 { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em; }
        .cms-editor-content h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.5em; }
        .cms-editor-content h4 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.5em; }
        .cms-editor-content p { margin: 0.5em 0; }
        .cms-editor-content ul, .cms-editor-content ol { padding-left: 1.5em; margin: 0.5em 0; }
        .cms-editor-content li { margin: 0.25em 0; }
        .cms-editor-content blockquote {
          border-left: 3px solid var(--cms-primary);
          padding-left: 1em;
          margin: 0.5em 0;
          color: var(--cms-text-secondary);
        }
        .cms-editor-content code {
          background: rgba(255,255,255,0.06);
          padding: 0.15em 0.35em;
          border-radius: 4px;
          font-family: var(--cms-font-mono);
          font-size: 0.875em;
        }
        .cms-editor-content pre {
          background: var(--cms-bg);
          border: 1px solid var(--cms-border);
          border-radius: 8px;
          padding: 1em;
          margin: 1em 0;
          overflow-x: auto;
        }
        .cms-editor-content pre code {
          background: none;
          padding: 0;
        }
        .cms-editor-content a { color: var(--cms-primary); text-decoration: underline; }
        .cms-editor-content img { max-width: 100%; border-radius: 8px; margin: 0.5em 0; }
        .cms-editor-content hr { border: none; border-top: 1px solid var(--cms-border); margin: 1.5em 0; }
        .cms-editor-content strong { font-weight: 600; color: var(--cms-text); }
      `}</style>
    </div>
  );
}

function ToolbarButton({ active, onClick, children, title, style = {} }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 28,
        border: 'none',
        borderRadius: 4,
        background: active ? 'var(--cms-primary-muted)' : 'transparent',
        color: active ? 'var(--cms-primary)' : 'var(--cms-text-secondary)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--cms-font)',
        transition: 'all 0.1s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
