import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { htmlToMarkdown, htmlTheRichEditorDrops, markdownToHtml, toAdminImages } from './markdown';
import { readingStats, slugify } from '../../lib/cms/text';
import { api, ApiError, toast, watchDeploy } from '../../scripts/admin/cms';

// The blog post editor. Markdown is what gets saved: the rich text mode edits
// HTML and is converted back only when its text was actually changed, so
// saving a post without touching its body writes the body back unchanged.

const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      width: { default: '560' },
      height: { default: '315' },
      title: { default: '' },
      frameborder: { default: '0' },
      allowfullscreen: { default: true },
      allow: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'iframe' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'iframe-wrapper' }, ['iframe', mergeAttributes(HTMLAttributes)]];
  },
});

interface BlogEditorProps {
  mode: 'new' | 'edit';
  slug?: string;
  initialData?: {
    frontmatter: Record<string, any>;
    content: string;
    sha: string;
  };
}

interface Fields {
  title: string;
  slug: string;
  date: string;
  summary: string;
  images: string;
  canonicalUrl: string;
  draft: boolean;
  tags: string[];
}
type Tag = { slug: string; name: string };
type EditorMode = 'rich' | 'markdown' | 'split';
interface Stored {
  fields: Fields;
  newTags: Tag[];
  content: string;
  baseSha: string;
  at: number;
}

const SITE = 'https://www.bengreenberg.dev';
const MODE_KEY = 'cms_editor_mode';
const today = () => new Date().toISOString().slice(0, 10);
const tagOf = (t: any) => String(typeof t === 'object' && t ? t.slug ?? t.id ?? '' : t ?? '');
const imgSrc = (v: string) => (v.startsWith('/static/images/') ? toAdminImages(`"${v}`).slice(1) : v);

function initialFields(slug: string | undefined, fm: Record<string, any> = {}): Fields {
  const date = fm.date ? new Date(fm.date) : null;
  return {
    title: fm.title || '',
    slug: slug || '',
    date: date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : today(),
    summary: fm.summary || '',
    images: fm.images || '',
    canonicalUrl: fm.canonicalUrl || '',
    draft: fm.draft ?? false,
    tags: Array.isArray(fm.tags) && fm.tags.length ? fm.tags.map(tagOf).filter(Boolean) : ['posts'],
  };
}

const sameFields = (a: Fields, b: Fields) => JSON.stringify(a) === JSON.stringify(b);

export default function BlogEditor({ mode: initialMode, slug: initialSlug, initialData }: BlogEditorProps) {
  const [mode, setMode] = useState(initialMode);
  const [originalSlug, setOriginalSlug] = useState<string | null>(initialMode === 'edit' ? initialSlug || null : null);
  const [fields, setFields] = useState<Fields>(() => initialFields(initialSlug, initialData?.frontmatter));
  const [newTags, setNewTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [sha, setSha] = useState(initialData?.sha || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [richDirty, setRichDirty] = useState(false);
  const [saved, setSaved] = useState(() => ({ fields: initialFields(initialSlug, initialData?.frontmatter), content: initialData?.content || '' }));
  const [restore, setRestore] = useState<Stored | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBranch, setPreviewBranch] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [richWords, setRichWords] = useState<number | null>(null);
  const autoSlug = useRef(initialMode === 'new');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mdFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // HTML in the post that rich text would drop: such posts open as markdown.
  const unsafeHtml = useMemo(() => htmlTheRichEditorDrops(initialData?.content || ''), [initialData]);
  const [editorMode, setEditorMode] = useState<EditorMode>(() => {
    if (unsafeHtml.length) return 'markdown';
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === 'rich' || m === 'markdown' || m === 'split') return m;
    } catch {
      // private mode
    }
    return 'rich';
  });

  const storeKey = `cms:blog:${originalSlug ?? 'new'}`;
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setFields((f) => ({ ...f, [k]: v }));

  const uploadRef = useRef<(file: File) => Promise<void>>(async () => {});
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: 'code-block' } },
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: 'Start writing your post... (paste or drop images here)' }),
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Iframe,
    ],
    content: editorMode === 'rich' && initialData?.content ? markdownToHtml(initialData.content) : '',
    editorProps: {
      attributes: { class: 'cms-editor-content' },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return false;
        files.forEach((f) => uploadRef.current(f));
        return true;
      },
      handleDrop: (_view, event) => {
        const files = [...((event as DragEvent).dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
        if (!files.length) return false;
        event.preventDefault();
        files.forEach((f) => uploadRef.current(f));
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      setRichDirty(true);
      setRichWords(e.getText().trim().split(/\s+/).filter(Boolean).length);
    },
  });

  /** The body as markdown, converting rich text only if it was edited. */
  const getContent = useCallback((): string => {
    if (editorMode === 'rich' && editor && richDirty) return htmlToMarkdown(editor.getHTML());
    return content;
  }, [editor, editorMode, richDirty, content]);

  const dirty = richDirty || content !== saved.content || !sameFields(fields, saved.fields);

  // ---- tags
  useEffect(() => {
    api<Tag[]>('/api/admin/tags').then(setAllTags).catch(() => {});
  }, []);
  const tagName = (slug: string) => allTags.find((t) => t.slug === slug)?.name || newTags.find((t) => t.slug === slug)?.name || slug;
  const addTag = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    const known = allTags.find((t) => t.slug === name.toLowerCase() || t.name.toLowerCase() === name.toLowerCase());
    const slug = known?.slug || slugify(name);
    if (!slug) return;
    if (!known && !newTags.some((t) => t.slug === slug)) setNewTags((n) => [...n, { slug, name }]);
    setFields((f) => (f.tags.includes(slug) ? f : { ...f, tags: [...f.tags, slug] }));
    setTagInput('');
  };
  const removeTag = (slug: string) => {
    setFields((f) => ({ ...f, tags: f.tags.filter((t) => t !== slug) }));
    setNewTags((n) => n.filter((t) => t.slug !== slug));
  };

  // ---- fields
  const onTitle = (v: string) => setFields((f) => ({ ...f, title: v, ...(autoSlug.current ? { slug: slugify(v) } : {}) }));
  const onSlug = (v: string) => {
    autoSlug.current = false;
    set('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-'));
  };

  // ---- modes
  const switchMode = (next: EditorMode) => {
    if (next === editorMode) return;
    let md = content;
    if (editorMode === 'rich' && editor && richDirty) {
      md = htmlToMarkdown(editor.getHTML());
      setContent(md);
      setRichDirty(false);
    }
    if (next === 'rich') {
      const drops = htmlTheRichEditorDrops(md);
      if (drops.length) {
        toast(`Rich text would drop this post's ${drops.map((t) => `<${t}>`).join(', ')}. Edit it as markdown.`, 'error');
        return;
      }
      editor?.commands.setContent(markdownToHtml(md), { emitUpdate: false });
      setRichWords(null);
    }
    setEditorMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // private mode
    }
  };

  // Set the whole body (import, upload, restore) in whichever mode is open.
  const replaceBody = (md: string) => {
    setContent(md);
    setRichDirty(false);
    if (editorMode === 'rich') editor?.commands.setContent(markdownToHtml(md), { emitUpdate: false });
  };

  // ---- live preview (split mode)
  useEffect(() => {
    if (editorMode !== 'split') return;
    const t = setTimeout(() => setPreviewHtml(markdownToHtml(content)), 200);
    return () => clearTimeout(t);
  }, [content, editorMode]);

  // ---- images
  const upload = useCallback(async (file: File, folderSlug = fields.slug): Promise<{ site: string; url: string } | null> => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(folderSlug)) {
      toast('Give the post a title (or slug) before adding images: they are stored with the post.', 'error');
      return null;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast(`${file.name} is over 4 MB. Resize it first.`, 'error');
      return null;
    }
    setUploading((n) => n + 1);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', `blog/${folderSlug}`);
      const res = await api<{ site: string; url: string; name: string }>('/api/admin/assets', { method: 'POST', body: form });
      toast(`Uploaded ${res.name}`, 'success');
      return res;
    } catch (err) {
      toast((err as Error).message, 'error');
      return null;
    } finally {
      setUploading((n) => n - 1);
    }
  }, [fields.slug]);

  const insertMarkdown = (snippet: string) => {
    const ta = textareaRef.current;
    setContent((c) => {
      if (!ta) return `${c}${c.endsWith('\n') ? '' : '\n'}${snippet}\n`;
      const at = ta.selectionStart ?? c.length;
      return `${c.slice(0, at)}${snippet}${c.slice(ta.selectionEnd ?? at)}`;
    });
  };

  uploadRef.current = async (file: File) => {
    const res = await upload(file);
    if (!res) return;
    const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    if (editorMode === 'rich' && editor) editor.chain().focus().setImage({ src: res.url, alt }).run();
    else insertMarkdown(`![${alt}](${res.site})`);
  };

  const onDropFiles = (e: React.DragEvent) => {
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    files.forEach((f) => uploadRef.current(f));
  };
  const onPasteFiles = (e: React.ClipboardEvent) => {
    const files = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    files.forEach((f) => uploadRef.current(f));
  };

  // ---- local backup of unsaved work
  useEffect(() => {
    try {
      const s: Stored | null = JSON.parse(localStorage.getItem(storeKey) || 'null');
      if (s && (s.baseSha === (initialData?.sha || '')) && (s.content !== (initialData?.content || '') || !sameFields(s.fields, saved.fields))) setRestore(s);
    } catch {
      // nothing usable
    }
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty || restore) return;
    const t = setTimeout(() => {
      try {
        const s: Stored = { fields, newTags, content: getContent(), baseSha: sha, at: Date.now() };
        localStorage.setItem(storeKey, JSON.stringify(s));
      } catch {
        // storage full or private mode
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [dirty, restore, fields, newTags, getContent, sha, storeKey]);

  const forgetLocal = () => {
    try {
      localStorage.removeItem(storeKey);
      localStorage.removeItem('cms:blog:new');
    } catch {
      // private mode
    }
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ---- save
  const handleSave = useCallback(async (draft = fields.draft) => {
    if (!fields.title.trim()) return toast('Title is required', 'error');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug)) return toast('Slug may only use lowercase letters, numbers and dashes.', 'error');
    if (originalSlug && originalSlug !== fields.slug && !draft) {
      toast(`Renaming changes the post's address from /blog/${originalSlug}/ to /blog/${fields.slug}/. Old links will break.`, 'info');
    }
    setSaving(true);
    const body = getContent();
    const next = { ...fields, draft };
    try {
      const res = await api<{ sha: string; commit: string; slug: string }>('/api/admin/blog', {
        json: { slug: next.slug, originalSlug, sha: sha || undefined, frontmatter: next, content: body, newTags },
      });
      setSha(res.sha);
      setFields(next);
      setContent(body);
      setRichDirty(false);
      setSaved({ fields: next, content: body });
      setAllTags((all) => [...all, ...newTags.filter((t) => next.tags.includes(t.slug))]);
      setNewTags([]);
      forgetLocal();
      setOriginalSlug(next.slug);
      autoSlug.current = false;
      if (mode === 'new' || originalSlug !== next.slug) history.replaceState(null, '', `/admin/blog/${next.slug}`);
      setMode('edit');
      watchDeploy(res.commit, next.draft ? undefined : `/blog/${next.slug}/`);
      toast(next.draft ? 'Draft saved. It stays off the site until you publish.' : mode === 'new' || saved.fields.draft ? 'Published. Deploying now.' : 'Updated. Deploying now.', 'success');
      if (previewBranch) cleanupPreview();
    } catch (err) {
      toast((err as Error).message, 'error');
      if (err instanceof ApiError && err.status === 409) {
        toast('Your changes are kept in this browser. Reload to get the latest version, then restore them.', 'info');
      }
    }
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, originalSlug, sha, getContent, newTags, mode, saved, previewBranch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving) handleSave();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [handleSave, saving]);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    try {
      const res = await api<{ commit: string }>('/api/admin/blog', { method: 'DELETE', json: { slug: originalSlug, sha } });
      forgetLocal();
      setSaved({ fields, content: getContent() });
      setRichDirty(false);
      watchDeploy(res.commit);
      toast('Post deleted', 'success');
      setTimeout(() => (location.href = '/admin/blog'), 600);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  // ---- import
  const handleImportUrl = async () => {
    if (!importUrl) return;
    setImporting(true);
    try {
      const data = await api('/api/admin/import-url', { json: { url: importUrl } });
      if (data.title) onTitle(data.title);
      if (data.summary) set('summary', data.summary);
      if (data.image) set('images', data.image);
      if (data.canonicalUrl) set('canonicalUrl', data.canonicalUrl);
      if (data.content) replaceBody(data.content);
      toast('Content imported. Review it, then save.', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
    setImporting(false);
  };

  const handleMdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || '');
      const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (fm) {
        for (const line of fm[1].split('\n')) {
          const [key, ...rest] = line.split(':');
          const value = rest.join(':').trim().replace(/^['"]|['"]$/g, '');
          if (!value) continue;
          if (key.trim() === 'title') onTitle(value);
          if (key.trim() === 'summary' || key.trim() === 'description') set('summary', value);
          if (key.trim() === 'date') set('date', value.slice(0, 10));
          if (key.trim() === 'images' || key.trim() === 'cover_image') set('images', value);
          if (key.trim() === 'canonicalUrl' || key.trim() === 'canonical_url') set('canonicalUrl', value);
        }
        replaceBody(fm[2].trim() + '\n');
      } else {
        replaceBody(text);
      }
      toast('Markdown file loaded', 'success');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ---- full-site preview on Vercel
  const cleanupPreview = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    if (previewBranch) api('/api/admin/preview', { json: { action: 'cleanup', branchName: previewBranch } }).catch(() => {});
    setPreviewUrl(null);
    setPreviewBranch(null);
    setPreviewing(false);
  }, [previewBranch]);

  useEffect(() => {
    api('/api/admin/preview', { json: { action: 'cleanup-all' } }).catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handlePreview = async () => {
    if (!fields.title || !fields.slug) return toast('Title and slug are required for preview', 'error');
    setPreviewing(true);
    setPreviewUrl(null);
    try {
      const data = await api('/api/admin/preview', { json: { slug: fields.slug, frontmatter: fields, content: getContent(), newTags } });
      setPreviewBranch(data.branchName);
      let attempts = 0;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const s = await api('/api/admin/preview', { json: { action: 'status', branchName: data.branchName } });
          if (s.previewUrl) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setPreviewUrl(`${s.previewUrl}/blog/${fields.slug}/`);
            setPreviewing(false);
            toast('Preview deployment ready', 'success');
          }
        } catch {
          // keep polling
        }
        if (attempts >= 36 && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPreviewing(false);
          toast('Preview is taking longer than expected. Check the Vercel dashboard.', 'info');
        }
      }, 5000);
    } catch (err) {
      toast((err as Error).message, 'error');
      setPreviewing(false);
    }
  };

  // ---- derived
  const stats = useMemo(() => {
    const base = readingStats(editorMode === 'rich' && richDirty ? '' : content);
    const words = editorMode === 'rich' && richDirty && richWords !== null ? richWords : base.words;
    return { words, minutes: Math.max(1, Math.round(words / 230)) };
  }, [content, editorMode, richDirty, richWords]);
  const titleLen = fields.title.trim().length;
  const summaryLen = fields.summary.trim().length;
  const liveUrl = mode === 'edit' && !saved.fields.draft && originalSlug ? `${SITE}/blog/${originalSlug}/` : null;
  const tagSuggestions = allTags.filter((t) => !fields.tags.includes(t.slug));

  return (
    <div className="be">
      {restore && (
        <div className="be-banner">
          <span>
            You have unsaved changes to this post from {new Date(restore.at).toLocaleString()} in this browser.
          </span>
          <div className="be-row">
            <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={() => {
              setFields(restore.fields);
              setNewTags(restore.newTags || []);
              replaceBody(restore.content);
              autoSlug.current = false;
              setRestore(null);
              toast('Restored your unsaved changes', 'success');
            }}>Restore</button>
            <button type="button" className="cms-btn cms-btn-ghost cms-btn-sm" onClick={() => { forgetLocal(); setRestore(null); }}>Discard</button>
          </div>
        </div>
      )}

      <div className="be-grid">
        <div className="be-main">
          <input
            className="be-title"
            type="text"
            value={fields.title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="Post title"
            aria-label="Title"
          />

          <div className="cms-card be-editor" onDragOver={(e) => e.preventDefault()}>
            <div className="be-tabs">
              {(['rich', 'markdown', 'split'] as EditorMode[]).map((m) => (
                <button key={m} type="button" className={editorMode === m ? 'on' : ''} onClick={() => switchMode(m)}>
                  {m === 'rich' ? 'Rich text' : m === 'markdown' ? 'Markdown' : 'Markdown + preview'}
                </button>
              ))}
              <span className="be-tabs-stats">
                {stats.words.toLocaleString()} words · {stats.minutes} min read
                {uploading > 0 && <> · <span className="cms-spinner be-spin" /> uploading</>}
              </span>
            </div>
            {unsafeHtml.length > 0 && editorMode !== 'rich' && (
              <div className="be-note">This post has HTML ({unsafeHtml.map((t) => `<${t}>`).join(', ')}) that rich text would drop, so it opens as markdown.</div>
            )}

            {editorMode === 'rich' && editor && <Toolbar editor={editor} onImage={() => imageFileRef.current?.click()} />}
            {editorMode !== 'rich' && (
              <div className="be-toolbar">
                <button type="button" className="be-tool be-tool-wide" onClick={() => imageFileRef.current?.click()}>Insert image</button>
                <span className="be-hint">Paste or drop images into the text to upload them.</span>
              </div>
            )}

            <div className={editorMode === 'split' ? 'be-split' : ''}>
              <div style={{ display: editorMode === 'rich' ? 'block' : 'none' }}>
                <EditorContent editor={editor} />
              </div>
              {editorMode !== 'rich' && (
                <textarea
                  ref={textareaRef}
                  className="be-md"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onDrop={onDropFiles}
                  onPaste={onPasteFiles}
                  spellCheck
                  placeholder="Write your markdown here..."
                />
              )}
              {editorMode === 'split' && <PreviewFrame html={previewHtml} title={fields.title} />}
            </div>
          </div>
          <input ref={imageFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { [...(e.target.files || [])].forEach((f) => uploadRef.current(f)); e.target.value = ''; }} />

          <div className="cms-card be-import">
            <input className="cms-input" type="url" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="Import a post from a URL (dev.to, Substack, any article)..." />
            <button className="cms-btn cms-btn-secondary" onClick={handleImportUrl} disabled={importing || !importUrl} type="button">
              {importing ? <><span className="cms-spinner be-spin" /> Importing...</> : 'Import URL'}
            </button>
            <input ref={mdFileRef} type="file" accept=".md,.mdx,.markdown" onChange={handleMdFile} hidden />
            <button className="cms-btn cms-btn-secondary" onClick={() => mdFileRef.current?.click()} type="button">Upload .md</button>
          </div>
        </div>

        <aside className="be-side">
          <div className="cms-card be-panel be-sticky">
            <div className="be-status">
              <span className={`cms-badge ${fields.draft ? 'cms-badge-yellow' : 'cms-badge-green'}`}>
                {mode === 'new' ? 'New post' : saved.fields.draft ? 'Draft' : 'Published'}
              </span>
              <span className="be-dirty">{saving ? 'Saving...' : dirty ? 'Unsaved changes' : mode === 'edit' ? 'All changes saved' : ''}</span>
            </div>
            <div className="be-actions">
              {(mode === 'new' || saved.fields.draft) ? (
                <>
                  <button className="cms-btn cms-btn-primary" type="button" disabled={saving} onClick={() => handleSave(false)}>Publish</button>
                  <button className="cms-btn cms-btn-secondary" type="button" disabled={saving} onClick={() => handleSave(true)}>Save draft</button>
                </>
              ) : (
                <>
                  <button className="cms-btn cms-btn-primary" type="button" disabled={saving || !dirty} onClick={() => handleSave(false)}>Update</button>
                  <button className="cms-btn cms-btn-secondary" type="button" disabled={saving} onClick={() => handleSave(true)} title="Take the post off the site">Unpublish</button>
                </>
              )}
            </div>
            <div className="be-kbd">⌘S saves · changes deploy in about a minute</div>
            <div className="be-links">
              <button type="button" className="be-link" onClick={handlePreview} disabled={previewing}>
                {previewing ? 'Building preview...' : 'Full-site preview'}
              </button>
              {previewUrl && <><a className="be-link" href={previewUrl} target="_blank" rel="noopener noreferrer">Open preview</a><button type="button" className="be-link" onClick={cleanupPreview}>Discard preview</button></>}
              {liveUrl && <a className="be-link" href={liveUrl} target="_blank" rel="noopener noreferrer">View live</a>}
              {originalSlug && mode === 'edit' && (
                <a className="be-link" href={`https://github.com/hummusonrails/personal-site/commits/main/src/content/blog/${originalSlug}.md`} target="_blank" rel="noopener noreferrer">History</a>
              )}
            </div>
          </div>

          <div className="cms-card be-panel">
            <label className="cms-label">Slug</label>
            <div className="be-slug">
              <span>/blog/</span>
              <input className="cms-input" value={fields.slug} onChange={(e) => onSlug(e.target.value)} placeholder="url-friendly-slug" />
            </div>
            {originalSlug && originalSlug !== fields.slug && (
              <div className="be-warn">Saving renames the post. Links to /blog/{originalSlug}/ will stop working.</div>
            )}
            <label className="cms-label be-gap">Date</label>
            <input className="cms-input" type="date" value={fields.date} onChange={(e) => set('date', e.target.value)} />
          </div>

          <div className="cms-card be-panel">
            <label className="cms-label">Tags</label>
            <div className="cms-tag-pills">
              {fields.tags.map((t) => (
                <span key={t} className="cms-tag-pill" title={newTags.some((n) => n.slug === t) ? 'New tag, created when you save' : t}>
                  {tagName(t)}{newTags.some((n) => n.slug === t) ? ' (new)' : ''}
                  <button onClick={() => removeTag(t)} type="button" aria-label={`Remove ${t}`}>&times;</button>
                </span>
              ))}
            </div>
            <input
              className="cms-input be-gap-sm"
              list="be-tag-list"
              value={tagInput}
              onChange={(e) => {
                const v = e.target.value;
                if (allTags.some((t) => t.slug === v)) addTag(v);
                else setTagInput(v);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Add a tag, or type a new one and press Enter"
            />
            <datalist id="be-tag-list">
              {tagSuggestions.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </datalist>
          </div>

          <div className="cms-card be-panel">
            <label className="cms-label">Summary <span className={`be-count ${summaryLen > 160 ? 'bad' : summaryLen >= 70 ? 'good' : ''}`}>{summaryLen}/160</span></label>
            <textarea className="cms-input be-summary" value={fields.summary} onChange={(e) => set('summary', e.target.value)} placeholder="One or two sentences for search results, social cards and the post list" rows={3} />

            <label className="cms-label be-gap">Cover image</label>
            {fields.images && <img className="be-cover" src={imgSrc(fields.images)} alt="" />}
            <div className="be-row">
              <input className="cms-input" value={fields.images} onChange={(e) => set('images', e.target.value)} placeholder="https://... or upload" />
              <button type="button" className="cms-btn cms-btn-secondary cms-btn-sm" onClick={() => coverFileRef.current?.click()}>Upload</button>
            </div>
            <input ref={coverFileRef} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              const res = await upload(f);
              if (res) set('images', res.site);
            }} />

            <label className="cms-label be-gap">Canonical URL</label>
            <input className="cms-input" value={fields.canonicalUrl} onChange={(e) => set('canonicalUrl', e.target.value)} placeholder="Original URL, if first published elsewhere" />
          </div>

          <div className="cms-card be-panel">
            <label className="cms-label">How it looks when shared</label>
            <div className="be-social">
              {fields.images && <img src={imgSrc(fields.images)} alt="" />}
              <div className="be-social-body">
                <div className="be-social-host">bengreenberg.dev</div>
                <div className={`be-social-title ${titleLen > 70 ? 'bad' : ''}`}>{fields.title || 'Post title'}</div>
                <div className="be-social-desc">{fields.summary || 'Add a summary so search results and social cards have a description.'}</div>
              </div>
            </div>
            {titleLen > 70 && <div className="be-warn">Titles over 70 characters get cut off in search results.</div>}
          </div>

          {mode === 'edit' && (
            <div className="cms-card be-panel">
              <button type="button" className="cms-btn cms-btn-danger cms-btn-sm" onClick={handleDelete}>
                {confirmDelete ? 'Click again to delete for good' : 'Delete post'}
              </button>
            </div>
          )}
        </aside>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

// Renders markdown in a sandboxed frame: imported content can carry HTML, and
// it must never run script inside the CMS.
function PreviewFrame({ html, title }: { html: string; title: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${PREVIEW_CSS}</style></head><body><h1>${title.replace(/[<>&]/g, '')}</h1>${html}</body></html>`;
  return <iframe className="be-preview" sandbox="allow-popups" srcDoc={doc} title="Preview" />;
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const B = ({ on, run, title, children, style }: { on?: boolean; run: () => void; title: string; children: React.ReactNode; style?: React.CSSProperties }) => (
    <button type="button" className={`be-tool ${on ? 'on' : ''}`} onClick={run} title={title} aria-label={title} style={style}>{children}</button>
  );
  const sep = <span className="be-sep" />;
  const c = () => editor.chain().focus();
  return (
    <div className="be-toolbar">
      <B on={editor.isActive('bold')} run={() => c().toggleBold().run()} title="Bold (⌘B)">B</B>
      <B on={editor.isActive('italic')} run={() => c().toggleItalic().run()} title="Italic (⌘I)" style={{ fontStyle: 'italic' }}>I</B>
      <B on={editor.isActive('underline')} run={() => c().toggleUnderline().run()} title="Underline" style={{ textDecoration: 'underline' }}>U</B>
      <B on={editor.isActive('strike')} run={() => c().toggleStrike().run()} title="Strikethrough" style={{ textDecoration: 'line-through' }}>S</B>
      {sep}
      <B on={editor.isActive('heading', { level: 2 })} run={() => c().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</B>
      <B on={editor.isActive('heading', { level: 3 })} run={() => c().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</B>
      <B on={editor.isActive('heading', { level: 4 })} run={() => c().toggleHeading({ level: 4 }).run()} title="Heading 4">H4</B>
      {sep}
      <B on={editor.isActive('bulletList')} run={() => c().toggleBulletList().run()} title="Bullet list">•</B>
      <B on={editor.isActive('orderedList')} run={() => c().toggleOrderedList().run()} title="Numbered list">1.</B>
      <B on={editor.isActive('blockquote')} run={() => c().toggleBlockquote().run()} title="Quote">❝</B>
      <B on={editor.isActive('codeBlock')} run={() => {
        if (editor.isActive('codeBlock')) return c().toggleCodeBlock().run();
        const lang = prompt('Code language (optional, e.g. ts, rust, bash):') ?? '';
        c().toggleCodeBlock({ language: lang.trim() || null } as never).run();
      }} title="Code block">{'</>'}</B>
      <B on={editor.isActive('code')} run={() => c().toggleCode().run()} title="Inline code">{'{}'}</B>
      {sep}
      <B on={editor.isActive('link')} run={() => {
        const prev = editor.getAttributes('link').href || '';
        const url = prompt('Link URL (leave empty to remove):', prev);
        if (url === null) return;
        if (!url) c().unsetLink().run();
        else c().extendMarkRange('link').setLink({ href: url }).run();
      }} title="Link">🔗</B>
      <B run={onImage} title="Upload image">🖼</B>
      <B run={() => {
        const url = prompt('YouTube or Vimeo URL:');
        const id = url?.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
        const vimeo = url?.match(/vimeo\.com\/(\d+)/)?.[1];
        const src = id ? `https://www.youtube.com/embed/${id}` : vimeo ? `https://player.vimeo.com/video/${vimeo}` : null;
        if (url && !src) return toast('That does not look like a YouTube or Vimeo link', 'error');
        if (src) c().insertContent({ type: 'iframe', attrs: { src, title: 'Video player' } }).run();
      }} title="Embed video">▶</B>
      <B run={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">▦</B>
      <B run={() => c().setHorizontalRule().run()} title="Divider">―</B>
      {sep}
      <B run={() => c().undo().run()} title="Undo (⌘Z)">↶</B>
      <B run={() => c().redo().run()} title="Redo (⇧⌘Z)">↷</B>
    </div>
  );
}

const PREVIEW_CSS = `
  body { margin: 0; padding: 24px 28px; background: #0b0b0d; color: #d4d4d8; font: 16px/1.75 'Space Grotesk', system-ui, sans-serif; }
  h1 { color: #fafafa; font-size: 1.9em; line-height: 1.2; margin: 0 0 0.8em; }
  h2, h3, h4 { color: #fafafa; line-height: 1.3; margin: 1.6em 0 0.5em; }
  a { color: #34d399; }
  img, video, iframe { max-width: 100%; border-radius: 8px; }
  iframe { aspect-ratio: 16 / 9; width: 100%; height: auto; border: 0; }
  pre { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 14px; overflow-x: auto; font-size: 13.5px; line-height: 1.55; }
  code { font-family: 'SF Mono', ui-monospace, monospace; font-size: 0.9em; }
  :not(pre) > code { background: #27272a; padding: 0.1em 0.35em; border-radius: 4px; }
  blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #10a37f; color: #a1a1aa; }
  table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #27272a; padding: 6px 10px; text-align: left; }
  hr { border: 0; border-top: 1px solid #27272a; margin: 2em 0; }
`;

const CSS = `
  .be { max-width: 1240px; margin: 0 auto; }
  .be-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
  @media (max-width: 1100px) { .be-grid { grid-template-columns: minmax(0, 1fr); } }
  .be-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .be-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .be-sticky { position: sticky; top: 0; z-index: 2; }
  @media (max-width: 1100px) { .be-sticky { position: static; } }
  .be-panel { padding: 16px; }
  .be-panel:hover { border-color: var(--cms-border); }
  .be-title { width: 100%; background: transparent; border: 0; outline: none; color: var(--cms-text); font: 600 30px/1.2 var(--cms-font); letter-spacing: -0.02em; padding: 4px 0; }
  .be-title::placeholder { color: var(--cms-text-muted); }
  .be-editor { padding: 0; overflow: hidden; }
  .be-editor:hover { border-color: var(--cms-border); }
  .be-tabs { display: flex; align-items: center; border-bottom: 1px solid var(--cms-border); background: var(--cms-surface); flex-wrap: wrap; }
  .be-tabs button { padding: 10px 16px; background: transparent; border: 0; border-bottom: 2px solid transparent; color: var(--cms-text-muted); font: 500 13px var(--cms-font); cursor: pointer; }
  .be-tabs button.on { background: var(--cms-card); color: var(--cms-text); border-bottom-color: var(--cms-primary); }
  .be-tabs-stats { margin-left: auto; padding: 0 14px; font-size: 12px; color: var(--cms-text-muted); display: inline-flex; align-items: center; gap: 4px; }
  .be-spin { width: 12px; height: 12px; display: inline-block; vertical-align: middle; }
  .be-note { padding: 8px 14px; font-size: 12.5px; color: var(--cms-warning); background: rgba(245, 158, 11, 0.08); border-bottom: 1px solid var(--cms-border); }
  .be-toolbar { display: flex; gap: 2px; padding: 6px 10px; border-bottom: 1px solid var(--cms-border); flex-wrap: wrap; align-items: center; position: sticky; top: 0; background: var(--cms-card); z-index: 1; }
  .be-tool { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 28px; padding: 0 6px; border: 0; border-radius: 4px; background: transparent; color: var(--cms-text-secondary); cursor: pointer; font: 600 13px var(--cms-font); }
  .be-tool:hover { background: var(--cms-border); color: var(--cms-text); }
  .be-tool.on { background: var(--cms-primary-muted); color: var(--cms-primary); }
  .be-tool-wide { padding: 0 10px; font-weight: 500; }
  .be-sep { width: 1px; height: 18px; background: var(--cms-border); margin: 0 6px; }
  .be-hint { font-size: 12px; color: var(--cms-text-muted); margin-left: 8px; }
  .be-md { display: block; width: 100%; min-height: 560px; background: var(--cms-bg); border: 0; color: var(--cms-text); font: 13.5px/1.7 var(--cms-font-mono); padding: 20px; resize: vertical; outline: none; tab-size: 2; }
  .be-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .be-split .be-md { border-right: 1px solid var(--cms-border); }
  @media (max-width: 900px) { .be-split { grid-template-columns: minmax(0, 1fr); } }
  .be-preview { width: 100%; height: 100%; min-height: 560px; border: 0; background: #0b0b0d; display: block; }
  .be-import { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 12px; }
  .be-import .cms-input { flex: 1; min-width: 220px; }
  .be-status { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .be-dirty { font-size: 12px; color: var(--cms-text-muted); }
  .be-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .be-actions .cms-btn { justify-content: center; }
  .be-actions .cms-btn:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
  .be-kbd { font-size: 11.5px; color: var(--cms-text-muted); margin-top: 8px; }
  .be-links { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--cms-border); }
  .be-link { background: none; border: 0; padding: 0; color: var(--cms-primary); font: 500 13px var(--cms-font); cursor: pointer; text-decoration: none; }
  .be-link:hover { text-decoration: underline; }
  .be-link:disabled { color: var(--cms-text-muted); cursor: default; text-decoration: none; }
  .be-slug { display: flex; align-items: center; gap: 4px; font: 13px var(--cms-font-mono); color: var(--cms-text-muted); }
  .be-slug .cms-input { font: 13px var(--cms-font-mono); padding: 8px 10px; }
  .be-gap { margin-top: 14px; }
  .be-gap-sm { margin-top: 8px; }
  .be-row { display: flex; gap: 8px; align-items: center; }
  .be-warn { margin-top: 8px; font-size: 12px; color: var(--cms-warning); }
  .be-count { float: right; font-weight: 400; color: var(--cms-text-muted); }
  .be-count.good { color: var(--cms-success); } .be-count.bad { color: var(--cms-danger); }
  .be-summary { font-family: var(--cms-font); resize: vertical; min-height: 70px; }
  .be-cover { display: block; width: 100%; max-height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid var(--cms-border); margin-bottom: 8px; }
  .be-social { border: 1px solid var(--cms-border); border-radius: 10px; overflow: hidden; background: var(--cms-bg); }
  .be-social img { display: block; width: 100%; aspect-ratio: 1.91 / 1; object-fit: cover; }
  .be-social-body { padding: 10px 12px; }
  .be-social-host { font-size: 11.5px; color: var(--cms-text-muted); }
  .be-social-title { font-weight: 600; font-size: 14px; margin: 2px 0; }
  .be-social-title.bad { color: var(--cms-warning); }
  .be-social-desc { font-size: 12.5px; color: var(--cms-text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .be-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px; margin-bottom: 16px; border: 1px solid var(--cms-warning); border-radius: 10px; background: rgba(245, 158, 11, 0.08); font-size: 14px; }

  .cms-editor-content { min-height: 520px; padding: 20px 24px; outline: none; font-size: 15.5px; line-height: 1.75; color: var(--cms-text); }
  .cms-editor-content p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--cms-text-muted); pointer-events: none; float: left; height: 0; }
  .cms-editor-content h2 { font-size: 1.5em; font-weight: 600; margin: 1.2em 0 0.4em; }
  .cms-editor-content h3 { font-size: 1.25em; font-weight: 600; margin: 1.1em 0 0.4em; }
  .cms-editor-content h4 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.4em; }
  .cms-editor-content p { margin: 0.6em 0; }
  .cms-editor-content ul, .cms-editor-content ol { padding-left: 1.5em; margin: 0.5em 0; }
  .cms-editor-content ul { list-style: disc; } .cms-editor-content ol { list-style: decimal; }
  .cms-editor-content li { margin: 0.25em 0; }
  .cms-editor-content blockquote { border-left: 3px solid var(--cms-primary); padding-left: 1em; margin: 0.8em 0; color: var(--cms-text-secondary); }
  .cms-editor-content code { background: rgba(255,255,255,0.06); padding: 0.15em 0.35em; border-radius: 4px; font-family: var(--cms-font-mono); font-size: 0.875em; }
  .cms-editor-content pre { background: var(--cms-bg); border: 1px solid var(--cms-border); border-radius: 8px; padding: 1em; margin: 1em 0; overflow-x: auto; }
  .cms-editor-content pre code { background: none; padding: 0; }
  .cms-editor-content a { color: var(--cms-primary); text-decoration: underline; }
  .cms-editor-content img { max-width: 100%; border-radius: 8px; margin: 0.5em 0; }
  .cms-editor-content img.ProseMirror-selectednode { outline: 2px solid var(--cms-primary); }
  .cms-editor-content hr { border: none; border-top: 1px solid var(--cms-border); margin: 1.5em 0; }
  .cms-editor-content strong { font-weight: 600; color: var(--cms-text); }
  .cms-editor-content .iframe-wrapper { margin: 1em 0; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; }
  .cms-editor-content .iframe-wrapper iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; border-radius: 8px; }
  .cms-editor-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .cms-editor-content th, .cms-editor-content td { border: 1px solid var(--cms-border); padding: 8px 12px; text-align: left; vertical-align: top; }
  .cms-editor-content th { background: rgba(255,255,255,0.06); font-weight: 600; }
`;
