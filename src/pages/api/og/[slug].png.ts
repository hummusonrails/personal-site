import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadFont(name: string): Buffer {
  // Try multiple resolution paths for dev vs build
  const paths = [
    join(process.cwd(), 'public', 'fonts', name),
    join(process.cwd(), 'dist', 'client', 'fonts', name),
  ];
  for (const p of paths) {
    try {
      return readFileSync(p);
    } catch { /* try next */ }
  }
  throw new Error(`Font not found: ${name}`);
}

export const prerender = true;

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts
    .filter((post) => !post.data.draft)
    .map((post) => ({
      params: { slug: post.slug },
      props: {
        title: post.data.title,
        date: post.data.date,
        tags: post.data.tags,
      },
    }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, date, tags } = props as {
    title: string;
    date: Date | string;
    tags?: Array<{ slug: string } | string>;
  };

  const fontRegular = loadFont('SpaceGrotesk-Regular.ttf');
  const fontBold = loadFont('SpaceGrotesk-Bold.ttf');

  const dateStr = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tagList = (tags || [])
    .map((t) => (typeof t === 'object' ? t.slug : t))
    .filter((t) => t !== 'posts')
    .slice(0, 3);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#171717',
          padding: '60px',
          fontFamily: 'Space Grotesk',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // Background accent gradient
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '-100px',
                right: '-100px',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
              },
            },
          },
          // Bottom accent
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '-80px',
                left: '-80px',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
              },
            },
          },
          // Top bar with site name
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#6366f1',
                          },
                        },
                      },
                      {
                        type: 'span',
                        props: {
                          style: {
                            color: '#8e8e8e',
                            fontSize: '22px',
                            fontWeight: 400,
                            letterSpacing: '0.05em',
                          },
                          children: 'bengreenberg.dev',
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      color: '#6b6b6b',
                      fontSize: '20px',
                      fontWeight: 400,
                    },
                    children: dateStr,
                  },
                },
              ],
            },
          },
          // Title
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flex: 1,
                alignItems: 'center',
              },
              children: [
                {
                  type: 'h1',
                  props: {
                    style: {
                      color: '#ececec',
                      fontSize: title.length > 60 ? '48px' : title.length > 40 ? '56px' : '64px',
                      fontWeight: 600,
                      lineHeight: 1.2,
                      margin: 0,
                      maxWidth: '900px',
                    },
                    children: title,
                  },
                },
              ],
            },
          },
          // Bottom bar with tags and author
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '40px',
                borderTop: '1px solid #3a3a3a',
                paddingTop: '24px',
              },
              children: [
                // Tags
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      gap: '10px',
                    },
                    children: tagList.map((tag) => ({
                      type: 'span',
                      props: {
                        style: {
                          color: '#b4b4b4',
                          fontSize: '18px',
                          backgroundColor: '#2f2f2f',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          fontWeight: 400,
                        },
                        children: `#${tag}`,
                      },
                    })),
                  },
                },
                // Author
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    },
                    children: [
                      {
                        type: 'span',
                        props: {
                          style: {
                            color: '#b4b4b4',
                            fontSize: '20px',
                            fontWeight: 400,
                          },
                          children: 'Ben Greenberg',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Space Grotesk', data: fontRegular, weight: 400, style: 'normal' as const },
        { name: 'Space Grotesk', data: fontBold, weight: 600, style: 'normal' as const },
      ],
    }
  );

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
