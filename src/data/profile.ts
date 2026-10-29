// The facts about Ben that greenberg.md, llms.txt, the JSON-LD and the site's
// own pages all read. Change a fact here and every one of them changes with it.
// Bump `reviewed` whenever you check this file against reality: greenberg.md
// shows it to agents, and the weekly profile check opens an issue once it is
// more than 90 days old.

export const PROFILE = {
  name: 'Ben Greenberg',
  handle: 'hummusonrails',
  reviewed: '2026-10-29',
  canonical: 'https://greenberg.md/',
  site: 'https://bengreenberg.dev',
  email: 'ben@yalladevrel.com',
  location: 'Israel',
  headline: 'Developer Relations Lead at Arbitrum, author of Vector Search with JavaScript',
  roles: [
    {
      title: 'Developer Relations Lead',
      org: 'Arbitrum',
      url: 'https://arbitrum.io',
      note: 'Employer. Arbitrum programs, products and results belong to Arbitrum and its teams.',
    },
    {
      title: 'Principal Consultant and Founder',
      org: 'Yalla DevRel LLC',
      url: 'https://yalladevrel.com',
      note: 'Consultancy that scales developer relations programs. Taking work.',
    },
  ],
  recognition: [
    { name: 'Docker Captain', current: true },
    { name: 'Agentic AI Foundation Ambassador', current: true },
    { name: 'Ruby Central board member', current: false },
  ],
  background:
    'Second-career developer. Before software, he spent a decade in adult education, community organizing, and non-profit management.',
  openTo: [
    { what: 'Speaking and keynotes', how: 'Email with the event, date, audience and format.' },
    { what: 'Hands-on workshops', how: 'Email with the event, audience size and the topic.' },
    { what: 'Podcasts and press', how: 'Email; photos and bios are on the media kit.', link: 'https://bengreenberg.dev/media' },
    { what: 'Developer relations consulting', how: 'Through Yalla DevRel LLC; email to start.', link: 'https://yalladevrel.com' },
  ],
  book: {
    title: 'Vector Search with JavaScript',
    publisher: 'The Pragmatic Bookshelf',
    published: 'September 2025',
    datePublished: '2025-09',
    pages: 128,
    isbn: '9798888651735',
    url: 'https://pragprog.com/titles/bgvector/vector-search-with-javascript/',
    page: 'https://bengreenberg.dev/book',
  },
  profiles: [
    { name: 'Website', url: 'https://bengreenberg.dev' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/hummusonrails/' },
    { name: 'GitHub', url: 'https://github.com/hummusonrails' },
    { name: 'X', url: 'https://x.com/hummusonrails' },
    { name: 'YouTube (Learn with Ben)', url: 'https://www.youtube.com/@HummusOnRails' },
    { name: 'Substack (Code and Conduct)', url: 'https://codeplusconduct.substack.com/' },
    { name: 'dev.to', url: 'https://dev.to/bengreenberg' },
  ],
  knowsAbout: [
    'Developer relations',
    'Developer experience',
    'Community building',
    'Vector search',
    'AI agents',
    'Payment rails',
    'Arbitrum',
    'Stylus',
    'WebAssembly',
    'JavaScript',
    'TypeScript',
    'Node.js',
    'Ruby',
    'Rust',
  ],
} as const;

export const CURRENT_RECOGNITION = PROFILE.recognition.filter((r) => r.current).map((r) => r.name);
export const FORMER_RECOGNITION = PROFILE.recognition.filter((r) => !r.current).map((r) => r.name);

const PROFILE_HOSTS = new Set(['greenberg.md', 'www.greenberg.md']);
export const isProfileHost = (host: string) => PROFILE_HOSTS.has(host.toLowerCase().replace(/:\d+$/, ''));
